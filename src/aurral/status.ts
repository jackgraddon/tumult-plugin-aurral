/**
 * Rich now-playing status.
 *
 * The plugin publishes one surface only: a plugin-owned extended profile
 * field, drawn by our activity renderer in Tumult member rows, the user bar
 * and profile cards, with album/artist images, title, album, a progress window
 * and a Squigly link button. The plain Matrix status line is left alone.
 *
 * The profile field is deliberately not `app.tumult.activity`: the shell owns
 * that document, and a second writer would fight its controller.
 *
 * Images are public HTTP URLs when Aurral supplies one. Token-protected
 * Aurral image routes are fetched and reduced to tiny data URLs first, so the
 * user's session token is never published to everyone who can see the profile.
 */
import type { ChatClient, Disposable } from "@tumult/ui";

import type { AurralClient, AurralTrack } from "./client";
import { record, text } from "./model";
import { currentClient } from "./session";

export const ACTIVITY_KEY = "com.jackgraddon.tumult.aurral.activity";
const VERSION = 1;
const MAX_TEXT = 128;
const MAX_URL = 2048;
const PAUSED_CLEAR_MS = 15_000;
const SQUIGLY_SLUG_LENGTH = 40;
const MBID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATA_IMAGE = /^data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i;

export interface ListeningActivity {
    v: 1;
    type: "listening";
    name: string;
    details: string;
    state: string;
    startedAt: number;
    endsAt?: number;
    media: Array<{ url: string; label?: string }>;
    buttons: Array<{ label: string; url: string }>;
    emoji: string;
}

let client: ChatClient | null = null;
let supportsFields = false;
let checkedFields = false;
let lastPublished: string | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;
let writeQueue: Promise<void> = Promise.resolve();
let publishGeneration = 0;

/** Cache resolved images and artist lookups; both are stable for a session. */
const imageCache = new Map<string, Promise<string | null>>();
const artistCache = new Map<string, Promise<string | null>>();

/** Turn a song's metadata into a Squigly universal link. */
export function squiglyUrl(track: AurralTrack): string | null {
    const artist = typeof track.artistName === "string" ? slug(track.artistName) : "";
    const title = typeof track.title === "string" ? slug(track.title) : "";
    if (!artist || !title) return null;
    return `https://squigly.link/song/${artist}/${title}`;
}

/**
 * Squigly's pretty URLs use NFKD-folded, lower-case, hyphenated artist/title
 * slugs capped at 40 characters. Apostrophes are separators, not removed:
 * "Heaven's Door" is `heaven-s-door`, not `heavens-door`.
 */
function slug(value: string): string {
    return value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, SQUIGLY_SLUG_LENGTH)
        .replace(/-+$/g, "");
}

/**
 * A media URL must fit the shell's activity document. Tiny inline images are
 * allowed because Aurral's library artwork needs the user's token.
 */
function safeUrl(value: unknown): string | null {
    if (typeof value !== "string" || !value || value.length > MAX_URL) return null;
    if (DATA_IMAGE.test(value)) return value;
    if (/^https?:\/\//i.test(value)) return value;
    return null;
}

/** Buttons are outbound links, so inline images are not valid here. */
function safeHttpUrl(value: unknown): string | null {
    if (typeof value !== "string" || !value || value.length > MAX_URL) return null;
    return /^https?:\/\//i.test(value) ? value : null;
}

function clip(value: string, max = MAX_TEXT): string {
    return value.slice(0, max);
}

/** Keep profile-field writes in call order so a late clear cannot win. */
function enqueueWrite(write: () => Promise<void>): Promise<void> {
    writeQueue = writeQueue.then(write, write);
    return writeQueue;
}

function cancelPendingClear(): void {
    if (clearTimer === null) return;
    clearTimeout(clearTimer);
    clearTimer = null;
}

/** Validate the arbitrary JSON a profile field returns. */
export function isListeningActivity(value: unknown): value is ListeningActivity {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const item = value as Partial<ListeningActivity>;
    if (item.v !== VERSION || item.type !== "listening") return false;
    if (typeof item.name !== "string" || !item.name.trim()) return false;
    if (typeof item.details !== "string" || typeof item.state !== "string") return false;
    if (typeof item.startedAt !== "number" || !Number.isFinite(item.startedAt) || item.startedAt < 0) return false;
    if (item.endsAt !== undefined && (typeof item.endsAt !== "number" || !Number.isFinite(item.endsAt) || item.endsAt < item.startedAt)) return false;
    if (!Array.isArray(item.media) || item.media.length > 2) return false;
    if (item.media.some((media) => !media || typeof media.url !== "string" || !safeUrl(media.url))) return false;
    if (!Array.isArray(item.buttons) || item.buttons.length > 2) return false;
    if (item.buttons.some((button) => !button || typeof button.label !== "string" || typeof button.url !== "string" || !safeHttpUrl(button.url))) return false;
    return typeof item.emoji === "string";
}

/** Start the status publisher; the returned function stops and clears it. */
export function startStatus(shell: ChatClient): Disposable {
    cancelPendingClear();
    ++publishGeneration;
    client = shell;
    lastPublished = null;
    checkedFields = false;
    supportsFields = false;
    void shell.profileFieldsSupported()
        .then((supported) => {
            supportsFields = supported;
            checkedFields = true;
        })
        .catch(() => {
            checkedFields = true;
        });
    return () => {
        void clearListening();
        client = null;
        supportsFields = false;
    };
}

/** Read through a bounded cache, so repeated tracks do not refetch artwork. */
function cached<T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T> {
    const existing = cache.get(key);
    if (existing) return existing;
    const pending = load();
    cache.set(key, pending);
    if (cache.size > 100) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
    }
    void pending.catch(() => {
        if (cache.get(key) === pending) cache.delete(key);
    });
    return pending;
}

function needsInlining(url: string): boolean {
    try {
        const parsed = new URL(url);
        if (parsed.searchParams.has("token")) return true;
        const aurral = currentClient();
        return !!aurral && url.startsWith(`${aurral.serverUrl}/`) && parsed.pathname.includes("/api/");
    } catch {
        return true;
    }
}

async function decodeImage(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
    if (typeof createImageBitmap === "function") return createImageBitmap(blob);
    const objectUrl = URL.createObjectURL(blob);
    try {
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error("Could not decode image"));
            image.src = objectUrl;
        });
        return image;
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

function renderThumb(image: ImageBitmap | HTMLImageElement, size: number, quality: number): string | null {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0, size, size);
    const webp = canvas.toDataURL("image/webp", quality);
    if (safeUrl(webp)) return webp;
    const jpeg = canvas.toDataURL("image/jpeg", quality);
    return safeUrl(jpeg);
}

/** Reduce a token-protected image to a small, shareable data URL. */
async function inlineImage(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, { mode: "cors" });
        if (!response.ok) return null;
        const image = await decodeImage(await response.blob());
        try {
            for (const size of [64, 48, 32]) {
                for (const quality of [0.62, 0.45, 0.3]) {
                    const data = renderThumb(image, size, quality);
                    if (data) return data;
                }
            }
        } finally {
            const bitmap = image as unknown as ImageBitmap;
            if (typeof bitmap.close === "function") bitmap.close();
        }
    } catch {
        // A missing or CORS-blocked image must never stop the status update.
    }
    return null;
}

/** Return a URL safe to put in a profile field shared with other members. */
async function shareableImage(value: unknown): Promise<string | null> {
    const url = safeUrl(value);
    if (!url) return null;
    if (url.startsWith("data:")) return url;
    if (!needsInlining(url)) return url;
    return cached(imageCache, url, () => inlineImage(url));
}

function pickTrackArtwork(track: AurralTrack): string | null {
    for (const key of ["artworkUrl", "largeArtworkUrl", "coverArtUrl", "coverUrl", "albumArtUrl", "imageUrl"]) {
        const url = safeUrl(track[key]);
        if (url) return url;
    }
    const album = record(track.album);
    for (const key of ["artworkUrl", "coverUrl", "imageUrl", "image"]) {
        const url = safeUrl(album[key]);
        if (url) return url;
    }
    return null;
}

function pickArtistImage(track: AurralTrack): string | null {
    for (const key of [
        "artistImageUrl",
        "artistArtworkUrl",
        "artistAvatarUrl",
        "artistImage",
        "artistPictureUrl",
    ]) {
        const url = safeUrl(track[key]);
        if (url) return url;
    }
    const artist = record(track.artist);
    for (const key of ["imageUrl", "image", "avatarUrl", "artworkUrl"]) {
        const url = safeUrl(artist[key]);
        if (url) return url;
    }
    const images = Array.isArray(artist.images) ? artist.images.map(record) : [];
    for (const entry of images) {
        const url = safeUrl(entry.image ?? entry.url);
        if (url) return url;
    }
    return null;
}

function artistMbidOf(track: AurralTrack): string | null {
    const artist = record(track.artist);
    return text(track, ["artistMbid"]) || text(artist, ["mbid", "artistMbid"]) || null;
}

/** Last resort: resolve a name to an artist portrait through unified search. */
async function searchArtistImage(client: AurralClient, name: string): Promise<string | null> {
    try {
        const result = await client.searchUnified(name, 5);
        // The server sends `top` as an object; older typings call it an array.
        const top = result.top as unknown;
        const topEntries = (Array.isArray(top) ? top : [top]).map(record);
        const candidates = [...topEntries.filter((entry) => text(entry, ["type"]) === "artist"), ...result.artists];
        const lower = name.toLowerCase();
        const exact = candidates.find(
            (entry) => String(entry.name ?? entry.artistName ?? "").toLowerCase() === lower,
        );
        const hit = exact ?? candidates[0];
        if (!hit) return null;
        const mbid = text(hit, ["mbid", "id", "key"]);
        if (MBID.test(mbid)) return client.artistImage(mbid);
        return safeUrl(text(hit, ["image", "imageUrl", "artistImageUrl"]));
    } catch {
        return null;
    }
}

async function artistImageSource(track: AurralTrack, client: AurralClient | null): Promise<string | null> {
    const explicit = pickArtistImage(track);
    if (explicit) return explicit;
    const mbid = artistMbidOf(track);
    if (mbid && client) return client.artistImage(mbid);
    const name = String(track.artistName ?? "").trim();
    if (!name || !client) return null;
    return cached(artistCache, `name:${name.toLowerCase()}`, () => searchArtistImage(client, name));
}

/** Publish (or update) the rich status for a playing track. */
export async function publishListening(
    track: AurralTrack | null,
    positionMs: number,
    playing: boolean,
): Promise<void> {
    // Any new playback signal means the pause grace period is over, and any
    // earlier in-flight image fetch is obsolete.
    cancelPendingClear();
    const generation = ++publishGeneration;
    const shell = client;
    if (!shell || !track || !playing) return;
    const title = String(track.title ?? "").trim();
    if (!title) return;

    const link = squiglyUrl(track);
    const [albumImage, artistImage] = await Promise.all([
        shareableImage(pickTrackArtwork(track)),
        artistImageSource(track, currentClient()).then(shareableImage),
    ]);
    if (generation !== publishGeneration || shell !== client) return;

    const media: ListeningActivity["media"] = [];
    if (albumImage) media.push({ url: albumImage, label: `${clip(title, 64)} album art` });
    if (artistImage && artistImage !== albumImage) {
        media.push({ url: artistImage, label: `${clip(String(track.artistName ?? "Artist"), 64)} artist image` });
    }

    const key = JSON.stringify([
        title,
        track.artistName,
        track.albumName,
        link,
        albumImage,
        artistImage,
        Math.floor(positionMs / 1000),
    ]);
    if (key === lastPublished) return;
    lastPublished = key;

    if (!checkedFields) {
        checkedFields = true;
        try {
            supportsFields = await shell.profileFieldsSupported();
        } catch {
            supportsFields = false;
        }
    }
    if (generation !== publishGeneration || shell !== client) return;

    const activity: ListeningActivity = {
        v: VERSION,
        type: "listening",
        name: clip(title),
        details: clip(String(track.artistName ?? "")),
        state: clip(String(track.albumName ?? "")),
        startedAt: Date.now() - Math.max(0, positionMs),
        media,
        buttons: link ? [{ label: "Listen on Squigly", url: link }] : [],
        emoji: "🎵",
    };
    const duration = typeof track.durationMs === "number" ? track.durationMs : 0;
    if (duration > 0) activity.endsAt = activity.startedAt + duration;

    if (!supportsFields) return;
    await enqueueWrite(async () => {
        if (generation !== publishGeneration || shell !== client) return;
        try {
            await shell.setProfileField(ACTIVITY_KEY, activity);
        } catch {
            supportsFields = false;
        }
    });
}

/** Clear the rich status after a short pause, so brief stops do not flicker. */
export function scheduleClearListening(delayMs = PAUSED_CLEAR_MS): void {
    cancelPendingClear();
    ++publishGeneration;
    if (!client || lastPublished === null) return;
    clearTimer = setTimeout(() => {
        clearTimer = null;
        void clearListening();
    }, delayMs);
}

/** Remove the rich status immediately (uninstall, sign-out, teardown). */
export async function clearListening(): Promise<void> {
    cancelPendingClear();
    ++publishGeneration;
    const shell = client;
    if (!shell || lastPublished === null) return;
    lastPublished = null;
    if (!supportsFields) return;
    await enqueueWrite(async () => {
        try {
            await shell.setProfileField(ACTIVITY_KEY, null);
        } catch {
            // Nothing else to do.
        }
    });
}
