/**
 * UI-facing data for the Aurral pane.
 *
 * The store follows the official client's page flow: Discover shelves,
 * grouped search, paged library tabs, playlist/flow cards, detail pages, and
 * the activity queue/history. Aurral remains the source of truth; this module
 * only normalizes responses for the Vue components.
 */
import { reactive } from "vue";

import { currentClient, session } from "./session";
import { errorText, list, normaliseTrack, record, text, withMetadata } from "./model";
import { enqueueTracks, next, playAt, setQueue } from "./player";
import type { AurralTrack, AurralClient } from "./client";

export type Item = Record<string, unknown>;
export type View = "discover" | "search" | "library" | "playlists" | "activity" | "people" | "shares";

export interface Shelf {
    id: string;
    title: string;
    items: Item[];
}

export interface SearchGroup {
    id: "top" | "artists" | "albums" | "tracks" | "playlists";
    title: string;
    items: Item[];
}

export interface DetailState {
    kind: "album" | "artist" | "playlist";
    id: string;
    item: Item;
    title: string;
    subtitle: string;
    artworkUrl: string | null;
    tracks: Item[];
    albums: Item[];
    loading: boolean;
}

export interface ActivityState {
    view: "queue" | "history";
    page: number;
    items: Item[];
    total: number;
    matching: number;
}

export interface UiState {
    view: View;
    query: string;
    searchScope: "all" | "library";
    libraryKind: "artists" | "albums" | "tracks" | "genres";
    page: number;
    availableOnly: boolean;
    favoriteOnly: boolean;
    sort: string;
    direction: "asc" | "desc";
    loading: boolean;
    error: string | null;
    shelves: Shelf[];
    searchGroups: SearchGroup[];
    library: Item[];
    libraryTotal: number;
    hasMore: boolean;
    playlists: Item[];
    flows: Item[];
    activity: ActivityState;
    people: Item[];
    shares: Item[];
    detail: DetailState | null;
    /** Detail pages left on the breadcrumb, so Back pops one level at a time. */
    detailStack: DetailState[];
    /** Mirrored by CSS so the pane's header hamburger can collapse the sidebar. */
    sidebarOpen: boolean;
    notice: string | null;
}

export const ui = reactive<UiState>({
    view: "discover",
    query: "",
    searchScope: "all",
    libraryKind: "albums",
    page: 1,
    availableOnly: false,
    favoriteOnly: false,
    sort: "",
    direction: "asc",
    loading: false,
    error: null,
    shelves: [],
    searchGroups: [],
    library: [],
    libraryTotal: 0,
    hasMore: false,
    playlists: [],
    flows: [],
    activity: { view: "queue", page: 1, items: [], total: 0, matching: 0 },
    people: [],
    shares: [],
    detail: null,
    detailStack: [],
    sidebarOpen: true,
    notice: null,
});

const DEFAULT_KEYS = ["items", "tracks", "songs", "albums", "artists", "genres", "results", "entries", "recommendations"];

/** Pull a usable array out of the several shapes Aurral uses for collections. */
function items(value: unknown, keys: string[] = DEFAULT_KEYS): Item[] {
    if (Array.isArray(value)) return value.map(record);
    const data = record(value);
    for (const key of keys) {
        const found = data[key];
        if (Array.isArray(found)) return found.map(record);
        if (typeof found === "object" && found !== null && key !== "items") {
            const nested = items(found, keys);
            if (nested.length) return nested;
        }
    }
    return [];
}

/**
 * Remember the kind a card was loaded as. Compact library rows and playlist
 * flows have no `type`/`kind` field, so guessing later loses artists and flows.
 */
function tagged(value: unknown, keys: string[] | undefined, kind: string | null): Item[] {
    const found = items(value, keys);
    return kind ? found.map((item) => ({ ...item, _kind: kind })) : found;
}

function shelf(id: string, title: string, kind: string | null, ...payloads: unknown[]): Shelf | null {
    const collected = payloads.flatMap((payload) => tagged(payload, undefined, kind));
    if (!collected.length) return null;
    const seen = new Set<string>();
    const unique = collected.filter((item) => {
        const key = itemId(item) || `${itemTitle(item)}:${itemSubtitle(item)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    return { id, title, items: unique.slice(0, 24) };
}

function group(id: SearchGroup["id"], title: string, kind: string | null, ...payloads: unknown[]): SearchGroup | null {
    const collected = payloads.flatMap((payload) => tagged(payload, undefined, kind));
    return collected.length ? { id, title, items: collected.slice(0, 40) } : null;
}

function dedupe(listToDedupe: Item[]): Item[] {
    const seen = new Set<string>();
    return listToDedupe.filter((item) => {
        const key = text(item, ["id", "handle", "username", "title", "name"]);
        if (!key || seen.has(key)) return !!key;
        seen.add(key);
        return true;
    });
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
        if (ui.detail) {
            await loadDetail(client);
        } else {
            switch (ui.view) {
                case "discover":
                    await loadDiscover(client);
                    break;
                case "search":
                    await loadSearch(client);
                    break;
                case "library":
                    await loadLibrary(client);
                    break;
                case "playlists":
                    await loadPlaylists(client);
                    break;
                case "activity":
                    await loadActivity(client);
                    break;
                case "people":
                    await loadPeople(client);
                    break;
                case "shares":
                    await loadShares(client);
                    break;
            }
        }
    } catch (cause) {
        ui.error = errorText(cause);
    } finally {
        ui.loading = false;
    }
}

async function loadDiscover(client: AurralClient): Promise<void> {
    const [discover, trending, playlists, mixes, recent, releases] = await Promise.allSettled([
        client.discover(),
        client.trending(),
        client.discoverPlaylists(),
        client.discoverMixes(),
        client.library("artists", { pageSize: 24, sort: "recentlyAdded", direction: "desc" }),
        client.recentReleases(),
    ]);
    const discoverData = record(discover.status === "fulfilled" ? discover.value : null);
    const trendingData = record(trending.status === "fulfilled" ? trending.value : null);
    const playlistData = record(playlists.status === "fulfilled" ? playlists.value : null);
    const mixData = record(mixes.status === "fulfilled" ? mixes.value : null);
    // Category objects are not cards: their `playlists` arrays are.
    const categoryPlaylists = items(playlistData.categories, ["categories", "items"])
        .flatMap((category) => items(category, ["playlists", "items"]));

    ui.shelves = [
        shelf("made-for-you", "Made for you", null, discoverData.recommendations, discoverData.globalTop, discoverData.top),
        shelf("based-on", "Based on your library", "artist", discoverData.basedOn),
        shelf("recently-added", "Recently added", "album", recent.status === "fulfilled" ? recent.value : null),
        shelf("trending-songs", "Trending songs", "track", trendingData.songs),
        shelf("trending-artists", "Trending artists", "artist", trendingData.artists),
        shelf("trending-albums", "Trending albums", "album", trendingData.albums),
        shelf("playlists", "Playlists", "playlist", playlistData.forYou, categoryPlaylists, mixData.discovery, mixData.mixes),
        shelf("new-releases", "Recent & upcoming releases", "album", releases.status === "fulfilled" ? releases.value : null),
    ].filter((value): value is Shelf => value !== null);
}

async function loadSearch(client: AurralClient): Promise<void> {
    const query = ui.query.trim();
    if (!query) {
        ui.searchGroups = [];
        return;
    }
    const [unified, library] = await Promise.allSettled([
        ui.searchScope === "all" ? client.searchUnified(query, 30) : Promise.resolve(null),
        client.searchLibrary(query, 30),
    ]);
    const unifiedData = record(unified.status === "fulfilled" ? unified.value : null);
    const libraryData = record(library.status === "fulfilled" ? library.value : null);

    ui.searchGroups = [
        group("top", "Top result", null, unifiedData.top),
        group("artists", "Artists", "artist", unifiedData.artists, libraryData.artists),
        group("albums", "Albums", "album", unifiedData.albums, libraryData.albums),
        group("tracks", "Tracks", "track", unifiedData.tracks, libraryData.tracks),
        group("playlists", "Playlists", "playlist", libraryData.playlists),
    ].filter((value): value is SearchGroup => value !== null);
}

async function loadLibrary(client: AurralClient): Promise<void> {
    const params: Record<string, string | number | boolean> = { page: ui.page, pageSize: 50 };
    if (ui.availableOnly) params.availableOnly = true;
    if (ui.favoriteOnly) params.favorite = true;
    if (ui.sort) {
        params.sort = ui.sort;
        params.direction = ui.direction;
    }
    const payload = await client.library(ui.libraryKind, params);
    const key = ui.libraryKind === "artists"
        ? "artists"
        : ui.libraryKind === "albums"
            ? "albums"
            : ui.libraryKind === "tracks"
                ? "tracks"
                : "genres";
    const kind = ui.libraryKind === "artists" ? "artist"
        : ui.libraryKind === "albums" ? "album"
            : ui.libraryKind === "tracks" ? "track" : null;
    ui.library = tagged(payload, [key, "items", "genres"], kind);
    ui.libraryTotal = typeof payload.total === "number" ? payload.total : ui.library.length;
    ui.hasMore = payload.hasMore === true || ui.page * 50 < ui.libraryTotal;
}

async function loadPlaylists(client: AurralClient): Promise<void> {
    const payload = record(await client.playlistStatus());
    ui.playlists = tagged(payload, ["staticPlaylists", "playlists", "items"], "playlist");
    ui.flows = tagged(payload, ["flows"], "playlist");
}

async function loadActivity(client: AurralClient): Promise<void> {
    const payload = await client.requestPage(ui.activity.view, ui.activity.page);
    ui.activity.items = items(payload, ["items", "requests"]);
    ui.activity.total = typeof payload.total === "number" ? payload.total : ui.activity.items.length;
    ui.activity.matching = typeof payload.matching === "number" ? payload.matching : ui.activity.total;
}

async function loadPeople(client: AurralClient): Promise<void> {
    const [people, friends] = await Promise.allSettled([client.people(), client.friends()]);
    const peopleData = record(people.status === "fulfilled" ? people.value : null);
    const friendData = record(friends.status === "fulfilled" ? friends.value : null);
    ui.people = dedupe([
        ...items(peopleData, ["people", "items"]),
        ...items(friendData, ["friends", "incoming", "outgoing"]),
    ]);
}

async function loadShares(client: AurralClient): Promise<void> {
    const payload = record(await client.shareLinks());
    ui.shares = items(payload, ["links", "items"]);
}

async function loadDetail(client: AurralClient): Promise<void> {
    const detail = ui.detail;
    if (!detail) return;
    detail.loading = true;
    try {
        if (detail.kind === "playlist") {
            detail.tracks = await previewTracksFor(client, detail.item, detail.kind, detail.id);
        } else if (detail.kind === "album") {
            const tracks = await libraryTracksFor(client, detail.item, detail.kind, detail.id);
            detail.tracks = tracks.length
                ? tracks
                : await previewTracksFor(client, detail.item, detail.kind, detail.id);
        } else {
            // External artists have no library albums. Don't let that lookup
            // abort the preview fallback below.
            const [albums, tracks] = await Promise.all([
                client.library("albums", { artistId: detail.id, pageSize: 50 }).catch(() => null),
                libraryTracksFor(client, detail.item, detail.kind, detail.id),
            ]);
            detail.albums = albums ? tagged(albums, ["albums", "items"], "album") : [];
            detail.tracks = tracks.length
                ? tracks
                : await previewTracksFor(client, detail.item, detail.kind, detail.id);
        }
    } catch (cause) {
        ui.error = errorText(cause);
    } finally {
        detail.loading = false;
    }
}

export function setView(view: View): void {
    if (ui.view === view && !ui.detail) return;
    ui.view = view;
    ui.detail = null;
    ui.detailStack = [];
    ui.error = null;
    void refresh();
}

export function setActivityView(view: "queue" | "history"): void {
    if (ui.activity.view === view) return;
    ui.activity.view = view;
    ui.activity.page = 1;
    void refresh();
}

export function toggleSidebar(): void {
    ui.sidebarOpen = !ui.sidebarOpen;
}

/** Append a card or track row to the player queue without interrupting it. */
export function enqueueItem(item: Item): number {
    const client = currentClient();
    if (!client) return 0;
    const direct = normaliseTrack(client, item);
    if (direct.streamPath) return enqueueTracks([direct]);
    const tracks = items(item, ["tracks", "songs", "items"])
        .map((entry) => normaliseTrack(client, entry))
        .filter((track) => !!track.streamPath);
    return enqueueTracks(tracks);
}

/** Open a library/search item's detail page. */
export function openDetail(item: Item, kind: DetailState["kind"]): void {
    const id = itemId(item);
    if (!id) {
        ui.notice = "That item does not expose an id.";
        return;
    }
    // Keep the tab the user was already in: the detail page is a sub-view of
    // that tab, not a jump to a different one.
    if (ui.detail) ui.detailStack.push(ui.detail);
    ui.detail = {
        kind,
        id,
        item,
        title: itemTitle(item),
        subtitle: itemSubtitle(item),
        artworkUrl: itemArtwork(item),
        tracks: [],
        albums: [],
        loading: true,
    };
    void refresh();
}

export function closeDetail(): void {
    const previous = ui.detailStack.pop();
    ui.error = null;
    ui.notice = null;
    if (previous) {
        // The earlier detail still has its loaded tracks/albums; no refetch.
        ui.detail = previous;
        return;
    }
    ui.detail = null;
    void refresh();
}

/** Play a collection, expanding albums/playlists that carry their own tracks. */
export function playCollection(collection: Item[], index = 0): void {
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
        const embedded = items(item, ["tracks", "songs", "items"]);
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

/** Playlist/flow jobs are playable at /playlists/stream/<job id>. */
function playlistJobTracks(client: AurralClient, jobs: unknown[]): AurralTrack[] {
    return jobs
        .map((value) => {
            const job = record(value);
            const id = text(job, ["id"]);
            return normaliseTrack(client, {
                ...job,
                title: text(job, ["trackName", "title", "name"], "Untitled"),
                artistName: text(job, ["artistName", "artist"]),
                albumName: text(job, ["albumName", "album"]) || null,
                streamPath: id ? `/playlists/stream/${encodeURIComponent(id)}` : null,
            });
        })
        .filter((track) => typeof track.streamPath === "string" && !!track.streamPath);
}

function playableTracks(client: AurralClient, values: unknown[]): AurralTrack[] {
    return values
        .map((value) => normaliseTrack(client, value))
        .filter((track) => !!track.streamPath);
}

/**
 * Preview endpoints return bare track rows. Fill in the artist/album/artwork
 * from the card the user clicked so the player and rich status stay useful.
 */
function withCardContext(item: Item, kind: string, values: unknown[]): Item[] {
    const artist = kind === "artist" ? itemTitle(item) : itemSubtitle(item);
    const album = kind === "album" ? itemTitle(item) : "";
    const artwork = itemArtwork(item);
    return values.map(record).map((track) => {
        const enriched: Item = { ...track };
        if (artist && !text(track, ["artistName", "artist"])) enriched.artistName = artist;
        if (album && !text(track, ["albumName", "album"])) enriched.albumName = album;
        if (artwork && !text(track, ["artworkUrl", "largeArtworkUrl", "coverUrl", "coverArtUrl", "imageUrl", "image"])) {
            enriched.artworkUrl = artwork;
        }
        return enriched;
    });
}

async function libraryTracksFor(client: AurralClient, _item: Item, kind: string, id: string): Promise<AurralTrack[]> {
    try {
        const filter = kind === "album" ? { albumId: id }
            : kind === "artist" ? { artistId: id }
                : { trackId: id };
        const payload = await client.library("tracks", {
            ...filter,
            pageSize: 100,
            compact: false,
            page: 1,
        });
        return playableTracks(client, items(payload, ["tracks", "items"]));
    } catch {
        // External Discover ids are not library ids; previews are next.
        return [];
    }
}

const MBID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Trending cards carry Deezer/Apple ids; preview endpoints need MusicBrainz
 * ids. Resolve by name (and the vendor id when present) exactly like the
 * official client's `/go/album` route does.
 */
async function previewIdsFor(
    client: AurralClient,
    item: Item,
    kind: string,
    id: string,
): Promise<{ artistMbid: string | null; albumMbid: string | null }> {
    if (MBID.test(id)) {
        return kind === "album"
            ? { artistMbid: null, albumMbid: id }
            : { artistMbid: id, albumMbid: null };
    }
    try {
        const links = await client.discoverLinks({
            artist: kind === "artist" ? itemTitle(item) : itemSubtitle(item),
            album: kind === "album" ? itemTitle(item) : "",
            albumId: text(item, ["key", "deezerAlbumId", "externalId"]),
            track: kind === "track" ? itemTitle(item) : "",
        });
        return {
            artistMbid: text(links, ["artistMbid"]) || null,
            albumMbid: text(links, ["albumMbid"]) || null,
        };
    } catch {
        return { artistMbid: null, albumMbid: null };
    }
}

/** Resolve the short preview streams used by Discover cards and detail pages. */
async function previewTracksFor(client: AurralClient, item: Item, kind: string, id: string): Promise<AurralTrack[]> {
    if (kind === "playlist") {
        const provider = text(item, ["provider", "source"]);
        if (provider) {
            try {
                const payload = await client.discoverPlaylist(provider, id);
                const tracks = playableTracks(client, items(payload, ["tracks", "songs", "items"]));
                if (tracks.length) return tracks;
            } catch {
                // Try the library jobs below; this may be a local playlist.
            }
        }
        try {
            return playlistJobTracks(client, await client.playlistJobs(id));
        } catch {
            return [];
        }
    }
    try {
        const ids = await previewIdsFor(client, item, kind, id);
        if (kind === "artist") {
            const mbid = ids.artistMbid || id;
            const payload = await client.artistPreviews(mbid, itemTitle(item));
            return playableTracks(client, withCardContext(item, kind, items(payload, ["tracks", "items"])));
        }
        if (kind === "album") {
            const mbid = ids.albumMbid || id;
            const payload = await client.releaseGroupTracks(mbid);
            return playableTracks(client, withCardContext(item, kind, items(payload, ["tracks", "items"])));
        }
    } catch {
        // No previews for this id; radio is the last resort.
    }
    return [];
}

async function radioTracksFor(client: AurralClient, kind: string, id: string): Promise<AurralTrack[]> {
    try {
        const payload = kind === "album"
            ? await client.radio({ albumIds: [id], limit: 100 })
            : kind === "artist"
                ? await client.radio({ artists: [{ id }], limit: 100 })
                : await client.radio({ trackIds: [id], limit: 100 });
        return playableTracks(client, items(payload, ["tracks"]));
    } catch {
        return [];
    }
}

/** Play one card: direct tracks, embedded tracks, or a resolved collection. */
export async function playItem(item: Item, kindHint?: string): Promise<void> {
    const client = currentClient();
    if (!client) return;
    const direct = normaliseTrack(client, item);
    if (direct.streamPath) {
        playCollection([item], 0);
        return;
    }
    const embedded = items(item, ["tracks", "songs", "items"]);
    if (embedded.length) {
        playCollection(embedded, 0);
        return;
    }
    const kind = kindHint || itemKind(item);
    const id = itemId(item);
    if (!id) {
        ui.notice = "That item does not include playable tracks.";
        return;
    }
    ui.notice = null;
    let tracks = await libraryTracksFor(client, item, kind, id);
    if (!tracks.length) tracks = await previewTracksFor(client, item, kind, id);
    if (!tracks.length && kind !== "playlist") tracks = await radioTracksFor(client, kind, id);
    if (!tracks.length) {
        ui.notice = "That item does not include playable tracks.";
        return;
    }
    setQueue(tracks, 0);
    void playAt(0);
}

/** Play the tracks currently shown in an open detail page. */
export async function playDetail(): Promise<void> {
    const detail = ui.detail;
    if (!detail) return;
    if (detail.tracks.length) {
        playCollection(detail.tracks, 0);
        return;
    }
    await playItem(detail.item, detail.kind);
}

export function itemId(item: Item): string {
    return text(item, ["id", "mbid", "key", "trackId", "albumId", "artistId", "playlistId", "jobId", "externalId"]);
}

export function itemKind(item: Item): string {
    const hinted = text(item, ["_kind"]).toLowerCase();
    if (hinted === "album" || hinted === "artist" || hinted === "playlist" || hinted === "track") {
        return hinted;
    }
    const explicit = text(item, ["type", "kind"]).toLowerCase();
    if (explicit.includes("album") || explicit.includes("release")) return "album";
    if (explicit.includes("artist")) return "artist";
    if (explicit.includes("playlist") || explicit.includes("flow")) return "playlist";
    if (item["tracks"] || item["trackIds"]) return "album";
    return "item";
}

export function itemTitle(item: Item): string {
    const data = withMetadata(item);
    return text(data, ["title", "name", "trackName", "album", "artist"], "Untitled");
}

export function itemSubtitle(item: Item): string {
    const data = withMetadata(item);
    return text(data, ["artistName", "albumName", "albumArtist", "ownerUsername", "username", "year", "releaseDate", "type", "status"]);
}

export function itemArtwork(item: Item): string | null {
    const data = withMetadata(item);
    const value = text(data, [
        "artworkUrl",
        "largeArtworkUrl",
        "coverArtUrl",
        "coverUrl",
        "albumArtUrl",
        "defaultCoverUrl",
        "imageUrl",
        "image",
        "artwork",
        "coverArt",
        "avatarUrl",
        "artistImageUrl",
    ]);
    if (value) return value;

    // Flows and static playlists only carry an artworkRevision; the official
    // client derives the image URL from it. artUrl() adds the session token,
    // which this route needs to return an image instead of a 401.
    const id = itemId(item);
    const revision = text(data, ["artworkRevision"]);
    if (!id || !revision) return null;
    const query = new URLSearchParams({ v: revision });
    return `/api/playlists/artwork/${encodeURIComponent(id)}?${query}`;
}

export function itemDuration(item: Item): string {
    const data = withMetadata(item);
    const value = text(data, ["durationMs", "duration_ms", "duration", "lengthMs", "length"]);
    if (!value) return "";
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return value;
    const ms = parsed < 1000 ? parsed * 1000 : parsed;
    const seconds = Math.floor(ms / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function itemStatus(item: Item): string {
    return text(item, ["status", "state", "phase"], "");
}

export { next, playAt };
