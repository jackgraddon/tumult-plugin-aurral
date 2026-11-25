/**
 * Library-only track state, currently the set of favorited songs.
 *
 * Aurral keys favorites by the track's identity key, not its numeric row id.
 * Discover previews have no library identity, so they cannot be favorited.
 */
import { ref } from "vue";

import type { AurralTrack } from "./client";
import { text } from "./model";
import { currentClient } from "./session";

type TrackLike = AurralTrack | Record<string, unknown>;

export const favoriteSongIds = ref<Set<string>>(new Set());
let loaded = false;

export async function loadFavorites(force = false): Promise<void> {
    const client = currentClient();
    if (!client || (loaded && !force)) return;
    try {
        const payload = await client.favorites();
        favoriteSongIds.value = new Set(payload.songIds ?? []);
        loaded = true;
    } catch {
        // Favorites are an extra, not a gate on playback.
    }
}

export function resetFavorites(): void {
    favoriteSongIds.value = new Set();
    loaded = false;
}

export function favoriteKey(track: TrackLike): string | null {
    const identity = text(track, ["identityKey"]);
    if (!identity) return null;
    return /^(flow|shared)-song:/.test(identity) ? identity : `song:${identity}`;
}

export function isFavorite(track: TrackLike): boolean {
    const key = favoriteKey(track);
    return key !== null && favoriteSongIds.value.has(key);
}

/** Optimistically flip a favorite and roll back if the server refuses. */
export async function toggleFavorite(track: TrackLike): Promise<boolean | null> {
    const key = favoriteKey(track);
    if (!key) return null;
    const previous = favoriteSongIds.value;
    const starred = !previous.has(key);
    const next = new Set(previous);
    if (starred) next.add(key);
    else next.delete(key);
    favoriteSongIds.value = next;
    try {
        await currentClient()?.setFavorites([key], starred);
        loaded = true;
        return starred;
    } catch {
        favoriteSongIds.value = previous;
        throw new Error("Could not update favorites.");
    }
}
