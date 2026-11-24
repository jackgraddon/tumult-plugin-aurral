/**
 * Rich now-playing status.
 *
 * The plugin publishes one surface only: a plugin-owned extended profile
 * field, drawn by our activity renderer in Tumult member rows, the user bar
 * and profile cards, with artwork, artist image, title, album, a progress
 * window and a Squigly link button. The plain Matrix status line is left alone.
 *
 * The profile field is deliberately not `app.tumult.activity`: the shell owns
 * that document, and a second writer would fight its controller.
 */
import type { ChatClient, Disposable } from "@tumult/ui";

import type { AurralTrack } from "./client";

export const ACTIVITY_KEY = "com.jackgraddon.tumult.aurral.activity";
const VERSION = 1;
const MAX_TEXT = 128;
const PAUSED_CLEAR_MS = 15_000;
const SQUIGLY_SLUG_LENGTH = 40;

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

/** Only absolute HTTP(S) URLs are accepted by the shell's activity renderer. */
function safeUrl(value: unknown): string | null {
    if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return null;
    return value.slice(0, 2048);
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
    if (item.buttons.some((button) => !button || typeof button.label !== "string" || typeof button.url !== "string" || !safeUrl(button.url))) return false;
    return typeof item.emoji === "string";
}

/** Start the status publisher; the returned function stops and clears it. */
export function startStatus(shell: ChatClient): Disposable {
    cancelPendingClear();
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

/** Publish (or update) the rich status for a playing track. */
export async function publishListening(
    track: AurralTrack | null,
    positionMs: number,
    playing: boolean,
): Promise<void> {
    // Any new playback signal means the pause grace period is over.
    cancelPendingClear();
    const shell = client;
    if (!shell || !track || !playing) return;
    const title = String(track.title ?? "").trim();
    if (!title) return;

    const link = squiglyUrl(track);
    const key = JSON.stringify([title, track.artistName, track.albumName, link, Math.floor(positionMs / 1000)]);
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

    const media: ListeningActivity["media"] = [];
    const artwork = safeUrl(track.artworkUrl);
    const artistImage = safeUrl(pickArtistImage(track));
    if (artwork) media.push({ url: artwork, label: `${clip(title, 64)} cover art` });
    if (artistImage && artistImage !== artwork) media.push({ url: artistImage, label: `${clip(String(track.artistName ?? "Artist"), 64)} artist image` });

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
    if (!client || lastPublished === null) return;
    clearTimer = setTimeout(() => {
        clearTimer = null;
        void clearListening();
    }, delayMs);
}

/** Remove the rich status immediately (uninstall, sign-out, teardown). */
export async function clearListening(): Promise<void> {
    cancelPendingClear();
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

function pickArtistImage(track: AurralTrack): string | null {
    for (const key of ["artistImageUrl", "artistArtworkUrl", "artistAvatarUrl", "artistImage", "artistPictureUrl", "previewUrl"]) {
        const value = track[key];
        if (typeof value === "string" && value) return value;
    }
    return null;
}
