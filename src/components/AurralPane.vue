<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import AuIcon from "./AuIcon.vue";
import ConnectPanel from "./ConnectPanel.vue";
import MediaCard from "./MediaCard.vue";
import TrackRow from "./TrackRow.vue";
import { currentClient, session } from "../aurral/session";
import { artUrl } from "../aurral/model";
import { loadQueue } from "../aurral/player";
import {
    closeDetail,
    itemKind,
    itemTitle,
    itemSubtitle,
    openDetail,
    playDetail,
    playItem,
    refresh,
    setActivityView,
    setView,
    ui,
} from "../aurral/store";

type Item = Record<string, unknown>;

const connected = computed(() => session.value !== null);
const libraryKinds = ["albums", "artists", "tracks", "genres"] as const;
const searchScopes = [
    { id: "all", label: "All" },
    { id: "library", label: "Your library" },
] as const;

const pageTitle = computed(() => {
    if (ui.detail) return ui.detail.title;
    return {
        discover: "Discover",
        search: "Search",
        library: "Library",
        playlists: "Playlists",
        activity: "Activity",
        people: "People",
        shares: "Share links",
    }[ui.view];
});

const pageEyebrow = computed(() => {
    if (ui.detail) return ui.detail.kind;
    return "Aurral";
});

const detailArtwork = computed(() => {
    if (!ui.detail) return null;
    return artUrl(currentClient(), ui.detail.artworkUrl, [
        "artworkUrl",
        "coverArtUrl",
        "coverUrl",
        "albumArtUrl",
        "defaultCoverUrl",
        "imageUrl",
        "artwork",
        "coverArt",
        "image",
    ]);
});

const detailSubtitle = computed(() => {
    if (!ui.detail) return "";
    return [ui.detail.subtitle, ui.detail.kind].filter(Boolean).join(" · ");
});

let searchTimer: number | undefined;
function onSearchInput(): void {
    if (searchTimer !== undefined) window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
        ui.page = 1;
        void refresh();
    }, 250);
}
onUnmounted(() => {
    if (searchTimer !== undefined) window.clearTimeout(searchTimer);
});

function openCard(item: Item): void {
    const kind = itemKind(item);
    if (kind === "album" || kind === "artist" || kind === "playlist") openDetail(item, kind);
    else if (item.tracks || item.trackIds) openDetail(item, "album");
    else void playItem(item, kind);
}

function playCard(item: Item): void {
    void playItem(item, itemKind(item));
}

function previousPage(): void {
    if (ui.page > 1) {
        ui.page -= 1;
        void refresh();
    }
}

function nextPage(): void {
    ui.page += 1;
    void refresh();
}

function personNote(item: Item): string {
    const nowPlaying = item.nowPlaying;
    if (nowPlaying && typeof nowPlaying === "object") {
        const data = nowPlaying as Record<string, unknown>;
        const title = String(data.title ?? data.name ?? "");
        const artist = String(data.artist ?? data.artistName ?? "");
        return [title, artist].filter(Boolean).join(" · ") || "Now playing";
    }
    if (typeof nowPlaying === "string" && nowPlaying) return nowPlaying;
    const lastPlayed = item.lastPlayed;
    if (lastPlayed && typeof lastPlayed === "object") {
        const data = lastPlayed as Record<string, unknown>;
        const title = String(data.title ?? data.name ?? "");
        const artist = String(data.artist ?? data.artistName ?? "");
        return [title, artist].filter(Boolean).join(" · ") || "Recently played";
    }
    if (typeof lastPlayed === "string" && lastPlayed) return lastPlayed;
    return "";
}

function shareUrl(item: Item): string {
    return String(item.url ?? item.shareUrl ?? item.link ?? item.shortUrl ?? "");
}

function restoreQueue(): void {
    const client = currentClient();
    if (!client) return;
    void client.getPlayQueue()
        .then((payload) => loadQueue(payload.queue))
        .catch(() => {
            // A missing queue is normal for a new account.
        });
}

onMounted(() => {
    if (!connected.value) return;
    void refresh();
    restoreQueue();
});
watch(session, (value) => {
    if (!value) return;
    void refresh();
    restoreQueue();
});
</script>

<template>
    <ConnectPanel v-if="!connected" />

    <div v-else class="au-app">
        <div class="au-page">
            <header class="au-page-header">
                <button v-if="ui.detail" class="au-button au-button--icon" type="button" aria-label="Back" @click="closeDetail"><AuIcon name="back" /></button>
                <div class="au-page-heading">
                    <div class="au-eyebrow">{{ pageEyebrow }}</div>
                    <h1>{{ pageTitle }}</h1>
                </div>
                <div class="au-page-actions">
                    <form v-if="ui.view === 'search' && !ui.detail" class="au-search au-search--header" @submit.prevent="refresh">
                        <input
                            v-model="ui.query"
                            class="au-input"
                            type="search"
                            placeholder="Search artists, albums, tracks…"
                            aria-label="Search Aurral"
                            @input="onSearchInput"
                        />
                        <button class="au-button" type="submit" :disabled="ui.loading">Search</button>
                    </form>
                    <button class="au-button au-button--icon" type="button" aria-label="Refresh" title="Refresh" :disabled="ui.loading" @click="refresh"><AuIcon name="refresh" /></button>
                </div>
            </header>

            <div class="au-page-scroll">
                <p v-if="ui.error" class="au-error" role="alert">{{ ui.error }}</p>
                <p v-if="ui.notice" class="au-notice" role="status">
                    {{ ui.notice }}
                    <button class="au-link-button" type="button" @click="ui.notice = null">Dismiss</button>
                </p>

                <!-- Detail pages -->
                <template v-if="ui.detail">
                    <section class="au-detail-hero">
                        <img v-if="detailArtwork" class="au-detail-art" :src="detailArtwork" :alt="`${ui.detail.title} artwork`" />
                        <div v-else class="au-detail-art au-detail-art--empty" aria-hidden="true"><AuIcon name="music" /></div>
                        <div class="au-detail-info">
                            <div class="au-detail-kind">{{ ui.detail.kind }}</div>
                            <h2>{{ ui.detail.title }}</h2>
                            <p>{{ detailSubtitle }}</p>
                            <div class="au-detail-actions">
                                <button class="au-button au-button--primary" type="button" :disabled="ui.detail.loading" @click="playDetail"><AuIcon name="play" /> Play</button>
                                <button class="au-button" type="button" :disabled="ui.detail.loading" @click="playDetail">⇄ Play all</button>
                            </div>
                        </div>
                    </section>

                    <div v-if="ui.detail.loading" class="au-muted">Loading…</div>

                    <template v-else>
                        <section v-if="ui.detail.kind === 'artist' && ui.detail.albums.length" class="au-section">
                            <h2 class="au-section-heading">Albums</h2>
                            <div class="au-grid au-grid--cards">
                                <MediaCard
                                    v-for="(album, index) in ui.detail.albums"
                                    :key="String(album.id ?? index)"
                                    :item="album"
                                    @open="openCard"
                                    @play="playCard"
                                />
                            </div>
                        </section>

                        <section v-if="ui.detail.tracks.length" class="au-section">
                            <h2 class="au-section-heading">{{ ui.detail.kind === 'artist' ? 'Popular tracks' : 'Tracks' }}</h2>
                            <div class="au-tracklist">
                                <TrackRow
                                    v-for="(track, index) in ui.detail.tracks"
                                    :key="String(track.id ?? index)"
                                    :item="track"
                                    :index="index"
                                    @play="playCard"
                                    @open="openCard"
                                />
                            </div>
                        </section>
                        <p v-else class="au-muted">No tracks available.</p>
                    </template>
                </template>

                <!-- Discover -->
                <template v-else-if="ui.view === 'discover'">
                    <section v-for="section in ui.shelves" :key="section.id" class="au-shelf">
                        <div class="au-shelf-heading">
                            <h2>{{ section.title }}</h2>
                            <span class="au-muted">{{ section.items.length }} items</span>
                        </div>
                        <div class="au-shelf-track">
                            <div class="au-shelf-cards">
                                <MediaCard
                                    v-for="(item, index) in section.items"
                                    :key="String(item.id ?? index)"
                                    :item="item"
                                    @open="openCard"
                                    @play="playCard"
                                />
                            </div>
                        </div>
                    </section>
                    <div v-if="!ui.shelves.length && !ui.loading" class="au-empty">
                        <h2>Nothing to show yet</h2>
                        <p class="au-muted">Your server has no discoverable shelves right now. Try Search or Library.</p>
                        <button class="au-button" type="button" @click="setView('library')">Open library</button>
                    </div>
                </template>

                <!-- Search -->
                <template v-else-if="ui.view === 'search'">
                    <form class="au-search au-search--page" @submit.prevent="refresh">
                        <input
                            v-model="ui.query"
                            class="au-input au-input--search"
                            type="search"
                            placeholder="Search artists, albums, tracks…"
                            aria-label="Search Aurral"
                            @input="onSearchInput"
                        />
                        <button class="au-button au-button--primary" type="submit" :disabled="ui.loading">Search</button>
                    </form>

                    <div class="au-chip-row">
                        <button
                            v-for="scope in searchScopes"
                            :key="scope.id"
                            class="au-chip"
                            :class="{ 'is-active': ui.searchScope === scope.id }"
                            type="button"
                            @click="ui.searchScope = scope.id; refresh()"
                        >{{ scope.label }}</button>
                    </div>

                    <div v-if="!ui.query" class="au-empty">
                        <h2>Search your music</h2>
                        <p class="au-muted">Find artists, albums, tracks and playlists on your Aurral server.</p>
                    </div>

                    <template v-else>
                        <section v-for="group in ui.searchGroups" :key="group.id" class="au-section">
                            <div class="au-shelf-heading">
                                <h2>{{ group.title }}</h2>
                                <span class="au-muted">{{ group.items.length }}</span>
                            </div>
                            <div v-if="group.id === 'tracks'" class="au-tracklist">
                                <TrackRow
                                    v-for="(item, index) in group.items"
                                    :key="String(item.id ?? index)"
                                    :item="item"
                                    :index="index"
                                    @play="playCard"
                                    @open="openCard"
                                />
                            </div>
                            <div v-else class="au-grid au-grid--cards">
                                <MediaCard
                                    v-for="(item, index) in group.items"
                                    :key="String(item.id ?? index)"
                                    :item="item"
                                    @open="openCard"
                                    @play="playCard"
                                />
                            </div>
                        </section>
                        <div v-if="!ui.searchGroups.length && !ui.loading" class="au-empty">
                            <h2>No results</h2>
                            <p class="au-muted">Try a different spelling or a shorter query.</p>
                        </div>
                    </template>
                </template>

                <!-- Library -->
                <template v-else-if="ui.view === 'library'">
                    <div class="au-toolbar">
                        <div class="au-tab-row" role="tablist" aria-label="Library type">
                            <button
                                v-for="kind in libraryKinds"
                                :key="kind"
                                class="au-tab"
                                :class="{ 'is-active': ui.libraryKind === kind }"
                                type="button"
                                role="tab"
                                :aria-selected="ui.libraryKind === kind"
                                @click="ui.libraryKind = kind; ui.page = 1; refresh()"
                            >{{ kind }}</button>
                        </div>
                        <div class="au-toolbar-spacer"></div>
                        <label class="au-inline-field">
                            <input v-model="ui.availableOnly" type="checkbox" @change="ui.page = 1; refresh()" />
                            Available only
                        </label>
                        <label class="au-inline-field">
                            <input v-model="ui.favoriteOnly" type="checkbox" @change="ui.page = 1; refresh()" />
                            Favorites
                        </label>
                        <select v-model="ui.sort" class="au-input au-input--compact" aria-label="Sort" @change="ui.page = 1; refresh()">
                            <option value="">Default order</option>
                            <option value="title">Title</option>
                            <option value="releaseDate">Release date</option>
                            <option value="recentlyAdded">Recently added</option>
                        </select>
                    </div>

                    <div class="au-grid au-grid--cards">
                        <MediaCard
                            v-for="(item, index) in ui.library"
                            :key="String(item.id ?? index)"
                            :item="item"
                            @open="openCard"
                            @play="playCard"
                        />
                    </div>

                    <div v-if="!ui.library.length && !ui.loading" class="au-empty">
                        <h2>No {{ ui.libraryKind }} yet</h2>
                        <p class="au-muted">This section of your library is empty.</p>
                    </div>

                    <div class="au-pagination">
                        <button class="au-button" type="button" :disabled="ui.page <= 1 || ui.loading" @click="previousPage"><AuIcon name="back" /> Previous</button>
                        <span class="au-muted">Page {{ ui.page }} · {{ ui.libraryTotal }} total</span>
                        <button class="au-button" type="button" :disabled="!ui.hasMore || ui.loading" @click="nextPage">Next <AuIcon name="forward" /></button>
                    </div>
                </template>

                <!-- Playlists -->
                <template v-else-if="ui.view === 'playlists'">
                    <section v-if="ui.flows.length" class="au-section">
                        <h2 class="au-section-heading">Flows</h2>
                        <div class="au-grid au-grid--cards">
                            <MediaCard
                                v-for="(item, index) in ui.flows"
                                :key="String(item.id ?? index)"
                                :item="item"
                                @open="openCard"
                                @play="playCard"
                            />
                        </div>
                    </section>

                    <section class="au-section">
                        <h2 class="au-section-heading">Playlists</h2>
                        <div class="au-grid au-grid--cards">
                            <MediaCard
                                v-for="(item, index) in ui.playlists"
                                :key="String(item.id ?? index)"
                                :item="item"
                                @open="openCard"
                                @play="playCard"
                            />
                        </div>
                    </section>

                    <div v-if="!ui.playlists.length && !ui.flows.length && !ui.loading" class="au-empty">
                        <h2>No playlists</h2>
                        <p class="au-muted">Create a playlist or flow in the Aurral client first.</p>
                    </div>
                </template>

                <!-- Activity -->
                <template v-else-if="ui.view === 'activity'">
                    <div class="au-toolbar">
                        <div class="au-tab-row" role="tablist" aria-label="Activity view">
                            <button class="au-tab" :class="{ 'is-active': ui.activity.view === 'queue' }" type="button" @click="setActivityView('queue')">Queue</button>
                            <button class="au-tab" :class="{ 'is-active': ui.activity.view === 'history' }" type="button" @click="setActivityView('history')">History</button>
                        </div>
                        <div class="au-toolbar-spacer"></div>
                        <span class="au-muted">{{ ui.activity.matching }} matching · {{ ui.activity.total }} total</span>
                    </div>

                    <div class="au-tracklist">
                        <div v-for="(item, index) in ui.activity.items" :key="String(item.id ?? index)" class="au-track">
                            <span class="au-track-index">{{ index + 1 }}</span>
                            <div class="au-track-content">
                                <div class="au-track-main">
                                    <div class="au-track-title">{{ itemTitle(item) }}</div>
                                    <div class="au-track-sub">{{ itemSubtitle(item) }}</div>
                                </div>
                            </div>
                            <div class="au-track-meta">
                                <span v-if="item.status" class="au-badge">{{ item.status }}</span>
                                <span class="au-track-time">{{ item.phase ?? item.cause ?? "" }}</span>
                            </div>
                        </div>
                    </div>

                    <div v-if="!ui.activity.items.length && !ui.loading" class="au-empty">
                        <h2>Nothing here</h2>
                        <p class="au-muted">Requests and listening history will appear in this view.</p>
                    </div>
                </template>

                <!-- People -->
                <template v-else-if="ui.view === 'people'">
                    <div class="au-grid au-grid--cards">
                        <article v-for="(item, index) in ui.people" :key="String(item.id ?? item.handle ?? index)" class="au-card au-card--person">
                            <div class="au-person-avatar" aria-hidden="true">{{ itemTitle(item).slice(0, 1).toUpperCase() }}</div>
                            <div class="au-card-title">{{ itemTitle(item) }}</div>
                            <div class="au-card-subtitle">{{ personNote(item) || "No recent activity" }}</div>
                        </article>
                    </div>
                    <div v-if="!ui.people.length && !ui.loading" class="au-empty">
                        <h2>No people yet</h2>
                        <p class="au-muted">Friends and local listeners will appear here when sharing is enabled.</p>
                    </div>
                </template>

                <!-- Share links -->
                <template v-else-if="ui.view === 'shares'">
                    <div class="au-tracklist">
                        <div v-for="(item, index) in ui.shares" :key="String(item.id ?? index)" class="au-track">
                            <div class="au-track-content">
                                <div class="au-track-main">
                                    <div class="au-track-title">{{ itemTitle(item) }}</div>
                                    <div class="au-track-sub">{{ itemSubtitle(item) }}</div>
                                </div>
                            </div>
                            <div class="au-track-meta">
                                <a v-if="shareUrl(item)" class="au-link" :href="shareUrl(item)" target="_blank" rel="noopener noreferrer">Open</a>
                                <span v-if="item.expiresAt" class="au-badge">Expires {{ item.expiresAt }}</span>
                            </div>
                        </div>
                    </div>
                    <div v-if="!ui.shares.length && !ui.loading" class="au-empty">
                        <h2>No share links</h2>
                        <p class="au-muted">Create share links from the Aurral client to see them here.</p>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>
