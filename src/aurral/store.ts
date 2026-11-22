/**
 * UI-facing data for the Aurral pane.
 *
 * Nothing here is authoritative: Aurral remains the source of truth. Each view
 * simply asks the server for a fresh page when opened, and playback publishes
 * its queue back through `player.ts`.
 */
import { reactive } from "vue";

import { currentClient, session } from "./session";
import { errorText, list, normaliseTrack, record, text } from "./model";
import { next, playAt, setQueue } from "./player";
import type { AurralTrack } from "./client";

export type View = "home" | "search" | "library" | "playlists" | "requests" | "people" | "shares";

export interface UiState {
    view: View;
    query: string;
    libraryKind: "artists" | "albums" | "tracks" | "genres";
    page: number;
    loading: boolean;
    error: string | null;
    homeSections: Array<{ title: string; items: Record<string, unknown>[] }>;
    results: Record<string, unknown>[];
    library: Record<string, unknown>[];
    hasMore: boolean;
    playlists: Record<string, unknown>[];
    playlistItems: Record<string, unknown>[];
    activePlaylist: string | null;
    requests: Record<string, unknown>[];
    people: Record<string, unknown>[];
    shares: Record<string, unknown>[];
    notice: string | null;
}

export const ui = reactive<UiState>({
    view: "home",
    query: "",
    libraryKind: "albums",
    page: 1,
    loading: false,
    error: null,
    homeSections: [],
    results: [],
    library: [],
    hasMore: false,
    playlists: [],
    playlistItems: [],
    activePlaylist: null,
    requests: [],
    people: [],
    shares: [],
    notice: null,
});

/** Pull a usable array out of the several shapes Aurral uses for collections. */
function items(value: unknown): Record<string, unknown>[] {
    if (Array.isArray(value)) return value.map(record);
    const data = record(value);
    for (const key of ["items", "tracks", "albums", "artists", "genres", "results", "entries"]) {
        if (Array.isArray(data[key])) return (data[key] as unknown[]).map(record);
    }
    return [];
}

function totalPages(value: unknown): boolean {
    const data = record(value);
    return data.hasMore === true || data.has_next === true || (typeof data.total === "number" && typeof data.page === "number" && data.page * 50 < data.total);
}

function section(title: string, ...payloads: unknown[]): { title: string; items: Record<string, unknown>[] } | null {
    const collected = payloads.flatMap(items);
    return collected.length ? { title, items: collected.slice(0, 24) } : null;
}

/** Load whichever view is open. */
export async function refresh(): Promise<void> {
    const client = currentClient();
    if (!client || !session.value) {
        ui.loading = false;
        return;
    }
    ui.loading = true;
    ui.error = null;
    try {
        switch (ui.view) {
            case "home": {
                const [discover, trending, recent, playlists] = await Promise.allSettled([
                    client.discover(),
                    client.trending(),
                    client.library("albums", { pageSize: 12 }),
                    client.playlistStatus(),
                ]);
                ui.homeSections = [
                    section("Recommended", discover.status === "fulfilled" ? discover.value : null, trending.status === "fulfilled" ? trending.value : null),
                    section("New in your library", recent.status === "fulfilled" ? recent.value : null),
                    section("Playlists", playlists.status === "fulfilled" ? playlists.value : null),
                ].filter((value): value is NonNullable<typeof value> => value !== null);
                break;
            }
            case "search": {
                if (!ui.query.trim()) {
                    ui.results = [];
                    break;
                }
                const [artists, albums, tracks] = await Promise.all([
                    client.search(ui.query, "artist", 20),
                    client.search(ui.query, "album", 20),
                    client.library("tracks", { search: ui.query, pageSize: 20 }).catch(() => ({ items: [] })),
                ]);
                ui.results = [...items(artists), ...items(albums), ...items(tracks)];
                break;
            }
            case "library": {
                const payload = await client.library(ui.libraryKind, { page: ui.page, pageSize: 50 });
                ui.library = items(payload);
                ui.hasMore = totalPages(payload);
                break;
            }
            case "playlists": {
                const payload = await client.playlistStatus();
                ui.playlists = items(payload);
                break;
            }
            case "requests": {
                ui.requests = items(await client.requests());
                break;
            }
            case "people": {
                const payload = await client.people();
                const friends = await client.friends().catch(() => ({}));
                ui.people = [...items(payload), ...items(friends)];
                break;
            }
            case "shares": {
                ui.shares = items(await client.shareLinks());
                break;
            }
        }
    } catch (cause) {
        ui.error = errorText(cause);
    } finally {
        ui.loading = false;
    }
}

export function setView(view: View): void {
    if (ui.view === view) return;
    ui.view = view;
    ui.error = null;
    void refresh();
}

/** Play a collection, expanding albums/playlists that carry their own tracks. */
export function playCollection(collection: Record<string, unknown>[], index: number): void {
    const client = currentClient();
    if (!client) return;
    const playable: AurralTrack[] = [];
    let start = 0;
    collection.forEach((item, position) => {
        const direct = normaliseTrack(client, item);
        if (direct.streamPath) {
            if (position < index) start = playable.length;
            playable.push(direct);
            return;
        }
        const embedded = list(item, ["tracks", "songs", "items"]);
        const tracks = embedded.map((entry) => normaliseTrack(client, entry)).filter((track) => track.streamPath);
        if (position < index) start = playable.length;
        playable.push(...tracks);
    });
    if (!playable.length) {
        ui.notice = "These items do not include a playable audio stream.";
        return;
    }
    const position = Math.min(start, playable.length - 1);
    setQueue(playable, position);
    void playAt(position);
}

/** Open a playlist's jobs/tracks. */
export async function openPlaylist(item: Record<string, unknown>): Promise<void> {
    const client = currentClient();
    if (!client) return;
    const id = text(item, ["id", "playlistId", "jobId", "staticPlaylistId"]);
    ui.activePlaylist = id || null;
    ui.playlistItems = items(item);
    if (!id) return;
    ui.loading = true;
    ui.error = null;
    try {
        const payload = await client.playlistJobs(id);
        ui.playlistItems = items(payload);
    } catch (cause) {
        ui.error = errorText(cause);
    } finally {
        ui.loading = false;
    }
}

export function itemId(item: Record<string, unknown>): string {
    return text(item, ["id", "trackId", "albumId", "artistId", "playlistId", "jobId"]);
}

export function itemTitle(item: Record<string, unknown>): string {
    return text(item, ["title", "name", "artist", "album"], "Untitled");
}

export function itemSubtitle(item: Record<string, unknown>): string {
    return text(item, ["artistName", "albumName", "year", "type", "owner", "username", "status"]);
}

export { next, playAt };
