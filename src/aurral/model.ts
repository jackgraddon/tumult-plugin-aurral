/**
 * Small helpers for turning Aurral's very fluid JSON shapes into the fields
 * the UI needs. The app contract guarantees a few stable fields, but older
 * servers and individual endpoints still vary — these helpers keep that
 * variation in one place.
 */
import type { AurralClient, AurralTrack } from "./client";

type RecordLike = Record<string, unknown>;

export function record(value: unknown): RecordLike {
    return typeof value === "object" && value !== null ? (value as RecordLike) : {};
}

export function field(value: unknown, keys: string[]): unknown {
    const data = record(value);
    for (const key of keys) {
        const found = data[key];
        if (found !== undefined && found !== null && found !== "") return found;
    }
    return undefined;
}

export function text(value: unknown, keys: string[], fallback = ""): string {
    const found = field(value, keys);
    return typeof found === "string" || typeof found === "number" ? String(found) : fallback;
}

export function numeric(value: unknown, keys: string[], fallback = 0): number {
    const found = field(value, keys);
    const parsed = typeof found === "number" ? found : Number(found);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function list(value: unknown, keys: string[] = []): RecordLike[] {
    if (Array.isArray(value)) return value.map(record);
    const found = field(value, keys);
    return Array.isArray(found) ? found.map(record) : [];
}

/**
 * Merge an object's own fields with the nested `metadata` object Aurral uses
 * for library entities. Top-level fields win, because the client often adds
 * authenticated image URLs there.
 */
export function withMetadata(value: unknown): RecordLike {
    const data = record(value);
    return { ...record(data.metadata), ...data };
}

/** A duration in milliseconds, whether the server sends ms, seconds or `mm:ss`. */
export function durationMs(value: unknown, keys: string[]): number {
    const found = field(value, keys);
    if (typeof found === "number") return found < 1000 ? found * 1000 : found;
    if (typeof found !== "string") return 0;
    if (/^\d+:\d{2}$/.test(found)) {
        const [minutes, seconds] = found.split(":").map(Number);
        return ((minutes ?? 0) * 60 + (seconds ?? 0)) * 1000;
    }
    const parsed = Number(found);
    return Number.isFinite(parsed) ? (parsed < 1000 ? parsed * 1000 : parsed) : 0;
}

/** Resolve an artwork value that may be a full URL or a server-relative path. */
export function artUrl(client: AurralClient | null, value: unknown, keys: string[]): string | null {
    // Callers pass both raw entities (extract the URL by key) and URLs that
    // itemArtwork()/detail state already extracted. A string is already the
    // artwork value — treating it as an object to search would lose it.
    const found = typeof value === "string" && value ? value : field(value, keys);
    if (typeof found !== "string" || !found) return null;
    if (/^https?:\/\//i.test(found) || found.startsWith("data:") || found.startsWith("blob:")) return found;
    if (!client || !found.startsWith("/")) return null;
    // `/api/...` artwork URLs are token-authenticated by Aurral; append the
    // session token the same way the official client does.
    return found.startsWith("/api/") || found.startsWith("/library/")
        ? client.authenticatedAsset(found)
        : client.asset(found);
}

const STREAM_KEYS = ["streamPath", "streamUrl", "url", "path", "audioUrl"];

export function normaliseTrack(client: AurralClient | null, value: unknown): AurralTrack {
    const data = withMetadata(value);
    const files = list(data, ["files"]);

    const candidates: string[] = [];
    const add = (path: string): void => {
        if (path && !candidates.includes(path)) candidates.push(path);
    };
    add(text(data, STREAM_KEYS));
    for (const file of files) add(text(file, STREAM_KEYS));

    // Library track rows have no streamPath, and Aurral's stream routes take a
    // TRACK id, not the `files[].id` values. A track can also belong to several
    // albums where only one has the file, so try every album context.
    const albumIds: string[] = [];
    const addAlbum = (value: string): void => {
        if (value && !albumIds.includes(value)) albumIds.push(value);
    };
    addAlbum(text(data, ["albumId", "libraryAlbumId"]));
    for (const album of list(data, ["albums"])) addAlbum(text(album, ["albumId", "id"]));
    for (const file of files) addAlbum(text(file, ["albumId"]));

    const numericId = text(data, ["id"]);
    const trackId =
        text(data, ["trackId", "libraryTrackId"]) ||
        (/^\d+$/.test(numericId) ? numericId : "");
    for (const albumId of albumIds) {
        if (!trackId) break;
        add(`/library/file-stream/${encodeURIComponent(albumId)}/${encodeURIComponent(trackId)}`);
        add(`/library/stream/${encodeURIComponent(albumId)}/${encodeURIComponent(trackId)}`);
    }

    const duration = durationMs(data, ["durationMs", "duration", "lengthMs", "length"]);
    return {
        ...data,
        title: text(data, ["title", "name", "trackTitle"], "Untitled"),
        artistName: text(data, ["artistName", "artist", "artistNameForDisplay", "albumArtist"]),
        albumName: text(data, ["albumName", "album", "albumTitle"]) || null,
        artworkUrl: artUrl(client, data, [
            "artworkUrl",
            "coverArtUrl",
            "coverUrl",
            "albumArtUrl",
            "imageUrl",
            "artwork",
            "coverArt",
            "image",
        ]),
        durationMs: duration || null,
        streamPath: candidates[0] ?? null,
        streamPaths: candidates,
        artistImageUrl: artUrl(client, data, [
            "artistImageUrl",
            "artistArtworkUrl",
            "artistAvatarUrl",
            "artistImage",
        ]),
        // Fall back to the album art when the track has no separate artist image.
        // It is not a portrait, but it is better than an empty activity card.
        previewUrl: artUrl(client, data, ["previewUrl", "preview"]) || null,
    };
}

export function formatTime(ms: number): string {
    if (!Number.isFinite(ms) || ms <= 0) return "0:00";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function errorText(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
