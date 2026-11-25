/**
 * Playback state for the Aurral pane.
 *
 * The audio element is fed a blob fetched with the session token: Aurral's
 * stream routes are not CORS-public, so an `<audio src="https://…?st=…">`
 * would be refused by the server's Cross-Origin-Resource-Policy. A fetch with
 * `Authorization` is allowed once the server lists Tumult in CORS_ORIGIN, and
 * the resulting blob URL plays normally (including seeking inside the loaded
 * file).
 */
import { computed, reactive, type ComputedRef } from "vue";

import { AurralClient, type AurralTrack, type PlayQueue } from "./client";
import { currentClient } from "./session";
import { normaliseTrack, record, text } from "./model";
import { publishListening, clearListening, scheduleClearListening } from "./status";

const SAVE_THROTTLE_MS = 5000;
const DEVICE = "Tumult";

export interface PlayerState {
    tracks: AurralTrack[];
    index: number;
    playing: boolean;
    loading: boolean;
    positionMs: number;
    durationMs: number;
    volume: number;
    error: string | null;
}

export const state = reactive<PlayerState>({
    tracks: [],
    index: 0,
    playing: false,
    loading: false,
    positionMs: 0,
    durationMs: 0,
    volume: 0.8,
    error: null,
});

export const currentTrack: ComputedRef<AurralTrack | null> = computed(
    () => state.tracks[state.index] ?? null,
);

let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
let loadToken = 0;
let pendingSeekMs = 0;
let lastSave = 0;
let playEventSent = false;

function publishServerNowPlaying(track: AurralTrack | null): void {
    const client = currentClient();
    if (!client || !track?.streamPath) return;
    const album = record(track.album);
    const artist = record(track.artist);
    const id = track.id ?? track.trackId;
    void client.publishNowPlaying({
        ...(id !== undefined ? { trackId: id as string | number } : {}),
        title: track.title,
        artist: track.artistName,
        album: track.albumName ?? (text(album, ["title", "name"]) || null),
        albumId: (track.albumId ?? album.id) as string | number | null,
        artistMbid: text(artist, ["mbid"]) || text(track, ["artistMbid"]) || null,
        albumMbid: text(track, ["albumMbid"]) || null,
        trackMbid: track.mbid ?? null,
        durationMs: track.durationMs ?? null,
        streamPath: track.streamPath,
    }).catch(() => {
        // Now-playing is best effort; playback must continue.
    });
}

function publishCompletedPlay(track: AurralTrack | null): void {
    const client = currentClient();
    if (!client || !track?.streamPath || playEventSent) return;
    const duration = track.durationMs ?? 0;
    if (duration <= 30_000 || state.positionMs < Math.min(duration / 2, 240_000)) return;
    playEventSent = true;
    const album = record(track.album);
    void client.publishPlayEvent({
        trackId: (track.id ?? track.trackId) as string | number | undefined,
        title: track.title,
        artist: track.artistName,
        album: track.albumName ?? (text(album, ["title", "name"]) || null),
        albumId: (track.albumId ?? album.id) as string | number | null,
        durationMs: duration,
        streamPath: track.streamPath,
    }).catch(() => {
        // Play history is best effort.
    });
}

function element(): HTMLAudioElement {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = "auto";
    audio.volume = state.volume;
    audio.addEventListener("timeupdate", () => {
        state.positionMs = Math.floor((audio?.currentTime ?? 0) * 1000);
        publishCompletedPlay(currentTrack.value);
    });
    audio.addEventListener("loadedmetadata", () => {
        const el = audio;
        if (!el) return;
        if (Number.isFinite(el.duration)) state.durationMs = Math.floor(el.duration * 1000);
        if (pendingSeekMs > 0) {
            el.currentTime = Math.min(pendingSeekMs / 1000, Math.max(0, el.duration - 1));
            pendingSeekMs = 0;
        }
    });
    audio.addEventListener("ended", () => {
        void next();
    });
    audio.addEventListener("error", () => {
        state.error = "This track could not be played.";
        state.playing = false;
        state.loading = false;
        scheduleClearListening();
    });
    return audio;
}

function stopAudio(): void {
    const el = element();
    el.pause();
    el.removeAttribute("src");
    el.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    pendingSeekMs = 0;
    state.playing = false;
}

function streamPathOf(track: AurralTrack): string | null {
    const value = track.streamPath;
    return typeof value === "string" && value ? value : null;
}

/** Every stream path worth trying for a track, in preference order. */
function streamPathsOf(track: AurralTrack): string[] {
    const paths = Array.isArray(track.streamPaths)
        ? track.streamPaths.filter(
              (path): path is string => typeof path === "string" && path.length > 0,
          )
        : [];
    const primary = streamPathOf(track);
    if (primary && !paths.includes(primary)) paths.unshift(primary);
    return paths;
}

async function loadCurrent(autoplay: boolean): Promise<void> {
    const client = currentClient();
    const track = currentTrack.value;
    if (!client || !track) {
        stopAudio();
        return;
    }
    const paths = streamPathsOf(track);
    if (!paths.length) {
        stopAudio();
        state.error = `No playable stream found for ${track.title}.`;
        return;
    }

    const token = ++loadToken;
    state.loading = true;
    state.error = null;
    playEventSent = false;
    stopAudio();
    try {
        let blob: Blob | null = null;
        let chosen: string | null = null;
        let lastError: unknown = null;
        for (const path of paths) {
            if (token !== loadToken) return;
            try {
                blob = await client.fetchAudio(path);
                if (token !== loadToken) return;
                chosen = path;
                break;
            } catch (cause) {
                if (token !== loadToken) return;
                lastError = cause;
            }
        }
        if (!blob || !chosen) {
            const detail =
                lastError instanceof Error
                    ? lastError.message
                    : lastError
                      ? String(lastError)
                      : "unknown error";
            throw new Error(paths.length > 1 ? `${detail} (tried ${paths.length} files)` : detail);
        }

        // Remember the path that worked so queue saves and now-playing use it.
        track.streamPath = chosen;
        objectUrl = URL.createObjectURL(blob);
        const el = element();
        pendingSeekMs = state.positionMs;
        el.src = objectUrl;
        el.volume = state.volume;
        state.durationMs = typeof track.durationMs === "number" ? track.durationMs : 0;
        if (autoplay) await el.play();
        state.playing = autoplay;
        void saveQueue();
        publishServerNowPlaying(currentTrack.value);
        void publishListening(currentTrack.value, state.positionMs, state.playing);
    } catch (cause) {
        if (token !== loadToken) return;
        const detail = cause instanceof Error ? cause.message : String(cause);
        state.error = `Could not play ${track.title}: ${detail}`;
        state.playing = false;
        scheduleClearListening();
    } finally {
        if (token === loadToken) state.loading = false;
    }
}

/**
 * Restore a saved queue once, without interrupting a live player.
 *
 * Tumult unmounts and remounts pane components when you navigate away and
 * back, but this module (and its `audio` element) survive. Reapplying the
 * server's saved queue on every mount would pause playback and rewind to the
 * last throttled save, so only do it while the player is idle.
 */
export function loadQueue(queue: PlayQueue | null): void {
    if (state.tracks.length > 0 || audio) return;
    ++loadToken;
    stopAudio();
    playEventSent = false;
    const client = currentClient();
    state.tracks = (queue?.tracks ?? []).map((track) => normaliseTrack(client, track));
    state.index = Math.min(Math.max(0, queue?.currentIndex ?? 0), Math.max(0, state.tracks.length - 1));
    state.positionMs = queue?.positionMs ?? 0;
    state.durationMs = currentTrack.value?.durationMs ?? 0;
    state.error = null;
}

export async function playAt(index: number): Promise<void> {
    if (index < 0 || index >= state.tracks.length) return;
    if (index === state.index && objectUrl) {
        await element().play();
        state.playing = true;
        publishServerNowPlaying(currentTrack.value);
        void publishListening(currentTrack.value, state.positionMs, true);
        return;
    }
    state.index = index;
    state.positionMs = 0;
    await loadCurrent(true);
}

export async function toggle(): Promise<void> {
    if (!currentTrack.value) {
        if (state.tracks.length) await playAt(0);
        return;
    }
    if (state.playing) {
        element().pause();
        state.playing = false;
        void saveQueue();
        scheduleClearListening();
    } else if (objectUrl) {
        await element().play();
        state.playing = true;
        publishServerNowPlaying(currentTrack.value);
        void publishListening(currentTrack.value, state.positionMs, true);
    } else {
        await loadCurrent(true);
    }
}

export async function next(): Promise<void> {
    if (state.index + 1 < state.tracks.length) await playAt(state.index + 1);
    else {
        stopAudio();
        state.positionMs = 0;
        scheduleClearListening();
    }
}

export async function previous(): Promise<void> {
    if (state.positionMs > 3000) {
        element().currentTime = 0;
        state.positionMs = 0;
        return;
    }
    if (state.index > 0) await playAt(state.index - 1);
}

export function seek(ms: number): void {
    state.positionMs = Math.max(0, Math.min(ms, state.durationMs || ms));
    if (objectUrl && audio) audio.currentTime = state.positionMs / 1000;
    void saveQueue();
}

export function setVolume(value: number): void {
    state.volume = Math.max(0, Math.min(1, value));
    if (audio) audio.volume = state.volume;
}

/** Queue tracks that have a stream path, in display order. */
export function setQueue(tracks: AurralTrack[], startIndex = 0): void {
    ++loadToken;
    stopAudio();
    playEventSent = false;
    state.tracks = tracks.filter((track) => typeof track.streamPath === "string");
    state.index = Math.min(Math.max(0, startIndex), Math.max(0, state.tracks.length - 1));
    state.positionMs = 0;
    state.durationMs = currentTrack.value?.durationMs ?? 0;
}

export async function saveQueue(): Promise<void> {
    const client = currentClient();
    if (!client || !state.tracks.length) return;
    const now = Date.now();
    if (now - lastSave < SAVE_THROTTLE_MS) return;
    lastSave = now;
    try {
        await client.savePlayQueue(
            state.tracks.map((track) => String(track.streamPath)),
            state.index,
            state.positionMs,
            DEVICE,
        );
    } catch {
        // A failed sync must never interrupt playback.
    }
}

/** Tear everything down on sign-out or plugin uninstall, not on pane remount. */
export function disposePlayer(): void {
    ++loadToken;
    stopAudio();
    if (audio) {
        audio = null;
    }
    state.tracks = [];
    state.index = 0;
    state.positionMs = 0;
    state.durationMs = 0;
    state.playing = false;
    state.loading = false;
    state.error = null;
    void clearListening();
}

export { AurralClient };
