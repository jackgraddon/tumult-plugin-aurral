/**
 * A small, typed client for Aurral's version-2 app API.
 *
 * It deliberately holds no Vue state: components own the reactive view of the
 * data, this module only speaks HTTP. Credentials are a user session token —
 * never the server's API key, which is an administrator credential and must
 * not live in a browser bundle.
 */

export interface AurralUser {
    id: number;
    username: string;
    role: string;
    permissions: Record<string, boolean>;
}

export interface AurralSession {
    serverUrl: string;
    token: string;
    expiresAt: number | null;
    user: AurralUser;
}

export interface Bootstrap {
    status: string;
    appVersion: string;
    authRequired: boolean;
    onboardingRequired: boolean;
    api: { version: number; features: string[]; [key: string]: unknown };
    user?: AurralUser;
}

/** A track as the play-queue and radio endpoints return it. */
export interface AurralTrack {
    title: string;
    artistName: string;
    albumName?: string | null;
    artworkUrl?: string | null;
    durationMs?: number | null;
    streamPath?: string | null;
    previewUrl?: string | null;
    mbid?: string | null;
    [key: string]: unknown;
}

export interface PlayQueue {
    changed: number | null;
    changedBy: string | null;
    tracks: AurralTrack[];
    currentIndex: number;
    positionMs: number;
}

export class AurralError extends Error {
    constructor(
        readonly status: number,
        readonly code: string,
        message?: string,
    ) {
        super(message || code);
        this.name = "AurralError";
    }
}

export interface LibraryPage<T = Record<string, unknown>> {
    kind: string;
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
    items?: T[];
    artists?: unknown[];
    albums?: unknown[];
    tracks?: unknown[];
    genres?: unknown[];
}

export interface SearchResults {
    scope: string;
    query: string;
    count: number;
    offset: number;
    items: Array<Record<string, unknown>>;
}

export interface UnifiedSearchResults {
    query: string;
    top: Array<Record<string, unknown>>;
    artists: Array<Record<string, unknown>>;
    albums: Array<Record<string, unknown>>;
    tracks: Array<Record<string, unknown>>;
}

export interface LibrarySearchResults {
    query: string;
    artists: Array<Record<string, unknown>>;
    albums: Array<Record<string, unknown>>;
    tracks: Array<Record<string, unknown>>;
    playlists: Array<Record<string, unknown>>;
}

export interface RequestPage {
    view: string;
    items: Array<Record<string, unknown>>;
    total: number;
    matching: number;
    filters: Array<Record<string, unknown>>;
    [key: string]: unknown;
}

export interface ShareLinks {
    links: Array<Record<string, unknown>>;
    tunnel?: Record<string, unknown>;
}

/**
 * Normalise a user-supplied server address. Keep any path prefix: a self-hosted
 * Aurral may be mounted under a sub-path, and dropping it would break every
 * request. Only the trailing slash goes.
 */
export function normaliseServerUrl(input: string): string {
    let value = input.trim().replace(/\/+$/, "");
    if (value && !/^https?:\/\//i.test(value)) value = `https://${value}`;
    return value;
}

export class AurralClient {
    constructor(
        readonly serverUrl: string,
        readonly token: string,
    ) {}

    /** Build a URL for a server asset (artwork, previews). */
    asset(path: string): string {
        return this.serverUrl + path;
    }

    /**
     * Build a token-authenticated URL for an `/api/...` asset. Aurral accepts
     * the session token in the query string for media URLs, which is how the
     * official client loads artwork and streams.
     */
    authenticatedAsset(path: string): string {
        const url = new URL(this.serverUrl + path);
        if (this.token) url.searchParams.set("token", this.token);
        return url.toString();
    }

    private async request<T>(
        path: string,
        init: RequestInit = {},
        authenticated = true,
    ): Promise<T> {
        const headers = new Headers(init.headers);
        if (init.body !== undefined && !headers.has("Content-Type"))
            headers.set("Content-Type", "application/json");
        if (authenticated && this.token) headers.set("Authorization", `Bearer ${this.token}`);

        let response: Response;
        try {
            response = await fetch(this.serverUrl + path, { ...init, headers });
        } catch (cause) {
            throw new AurralError(
                0,
                "network",
                `Could not reach ${this.serverUrl}. Check the server address and that it allows requests from this origin (CORS_ORIGIN).`,
            );
        }
        if (!response.ok) {
            let body: { error?: string; message?: string } = {};
            try {
                body = (await response.json()) as typeof body;
            } catch {
                // A proxy error page is not JSON; the status is still useful.
            }
            throw new AurralError(response.status, body.error ?? "request_failed", body.message);
        }
        if (response.status === 204) return undefined as T;
        return (await response.json()) as T;
    }

    bootstrap(): Promise<Bootstrap> {
        return this.request<Bootstrap>("/api/health/bootstrap", {}, false);
    }

    me(): Promise<{ user: AurralUser; expiresAt: number | null }> {
        return this.request("/api/auth/me");
    }

    /** Sign in, returning the session to persist. */
    static async login(
        serverUrl: string,
        username: string,
        password: string,
    ): Promise<AurralSession> {
        const client = new AurralClient(serverUrl, "");
        const result = await client.request<{
            token: string;
            expiresAt: number;
            user: AurralUser;
        }>("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
        });
        return { serverUrl, token: result.token, expiresAt: result.expiresAt, user: result.user };
    }

    /** A short-lived token for media URLs that cannot carry a header. */
    async streamToken(): Promise<string> {
        const result = await this.request<{ token: string; expiresIn: number }>(
            "/api/health/stream-token",
            { method: "POST" },
        );
        return result.token;
    }

    /** Fetch an audio stream as a blob so it can play without a custom header. */
    async fetchAudio(path: string): Promise<Blob> {
        const headers = new Headers();
        headers.set("Authorization", `Bearer ${this.token}`);
        let response: Response;
        try {
            response = await fetch(this.asset(path), { headers });
        } catch {
            throw new AurralError(0, "network", "The audio stream could not be fetched.");
        }
        if (!response.ok) throw new AurralError(response.status, "stream_failed");
        return response.blob();
    }

    getPlayQueue(): Promise<{ queue: PlayQueue | null }> {
        return this.request("/api/play-queue");
    }

    async savePlayQueue(
        streamPaths: string[],
        current: number,
        positionMs: number,
        device = "Tumult",
    ): Promise<void> {
        await this.request("/api/play-queue", {
            method: "PUT",
            body: JSON.stringify({ streamPaths, current, positionMs, device }),
        });
    }

    async clearPlayQueue(device = "Tumult"): Promise<void> {
        await this.request("/api/play-queue", {
            method: "DELETE",
            body: JSON.stringify({ device }),
        });
    }

    /**
     * Fetch one library page. The client always asks for `compact=true`, so
     * responses carry the matching `artists`/`albums`/`tracks` array rather
     * than a generic `items` array.
     */
    library<T = Record<string, unknown>>(
        kind: "artists" | "albums" | "tracks" | "genres",
        params: Record<string, string | number | boolean> = {},
    ): Promise<LibraryPage<T>> {
        const query = new URLSearchParams({ kind, pageSize: "50", compact: "true" });
        for (const [key, value] of Object.entries(params)) query.set(key, String(value));
        return this.request(`/api/library?${query}`);
    }

    /**
     * Turn a set of library ids into playable radio-shaped tracks with
     * `streamPath`. The official player uses this for album/artist playback.
     */
    radio(params: {
        trackIds?: Array<string | number>;
        albumIds?: Array<string | number>;
        artists?: Array<string | number>;
        exclude?: Array<string | number>;
        limit?: number;
    }): Promise<{ tracks: unknown[] }> {
        return this.request("/api/library/radio", {
            method: "POST",
            body: JSON.stringify(params),
        });
    }

    search(q: string, scope: "artist" | "album" | "tag" = "artist", limit = 30): Promise<SearchResults> {
        const query = new URLSearchParams({ q, scope, limit: String(limit) });
        return this.request(`/api/search?${query}`);
    }

    searchUnified(q: string, limit = 30): Promise<UnifiedSearchResults> {
        const query = new URLSearchParams({ q, limit: String(limit) });
        return this.request(`/api/search/unified?${query}`);
    }

    searchLibrary(q: string, limit = 30): Promise<LibrarySearchResults> {
        const query = new URLSearchParams({ q, limit: String(limit) });
        return this.request(`/api/search/library?${query}`);
    }

    discover(): Promise<Record<string, unknown>> {
        return this.request("/api/discover");
    }

    discoverPlaylists(scope: "featured" | "all" = "featured"): Promise<Record<string, unknown>> {
        const query = new URLSearchParams({ scope });
        return this.request(`/api/discover/playlists?${query}`);
    }

    recentReleases(): Promise<Array<Record<string, unknown>>> {
        return this.request("/api/library/recent-releases");
    }

    trending(): Promise<Record<string, unknown>> {
        return this.request("/api/discover/trending");
    }

    playlistStatus(): Promise<Record<string, unknown>> {
        return this.request("/api/playlists/status");
    }

    playlistJobs(playlistId: string, limit = 200): Promise<Array<Record<string, unknown>>> {
        const query = new URLSearchParams({ limit: String(limit) });
        return this.request(`/api/playlists/jobs/${encodeURIComponent(playlistId)}?${query}`);
    }

    requestPage(
        view: "queue" | "history" = "queue",
        page = 1,
        status?: string,
    ): Promise<RequestPage> {
        const query = new URLSearchParams({ view, page: String(page) });
        if (status) query.set("status", status);
        return this.request(`/api/requests/page?${query}`);
    }

    shareLinks(): Promise<ShareLinks> {
        return this.request("/api/share-links/");
    }

    createPlainShareLink(): Promise<{ link: string }> {
        return this.request("/api/share-links/plain", { method: "POST" });
    }

    people(): Promise<{ sharing: boolean; people: Array<Record<string, unknown>> }> {
        return this.request("/api/people");
    }

    friends(): Promise<Record<string, unknown>> {
        return this.request("/api/hub-link/friends");
    }

    /** Subscribe to one track without counting it as a completed play. */
    publishNowPlaying(track: {
        trackId?: string | number;
        title: string;
        artist: string;
        album?: string | null;
        albumId?: string | number | null;
        artistMbid?: string | null;
        albumMbid?: string | null;
        trackMbid?: string | null;
        durationMs?: number | null;
        streamPath: string;
    }): Promise<void> {
        return this.request("/api/play-events/now-playing", {
            method: "POST",
            body: JSON.stringify(track),
        });
    }

    /** Record a completed play after the halfway/30s threshold. */
    publishPlayEvent(track: Record<string, unknown>): Promise<void> {
        return this.request("/api/play-events", {
            method: "POST",
            body: JSON.stringify({ ...track, playedAt: Date.now(), source: "native-player" }),
        });
    }
}
