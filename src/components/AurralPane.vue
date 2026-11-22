<script setup lang="ts">
import { computed, onMounted, watch } from "vue";

import ConnectPanel from "./ConnectPanel.vue";
import { currentClient, session } from "../aurral/session";
import { artUrl, list, text } from "../aurral/model";
import { itemId, itemSubtitle, itemTitle, openPlaylist, playCollection, refresh, ui } from "../aurral/store";

type Item = Record<string, unknown>;

const connected = computed(() => session.value !== null);
const libraryKinds = ["albums", "artists", "tracks", "genres"] as const;

onMounted(() => {
    if (connected.value) void refresh();
});
watch(session, (next) => {
    if (next) void refresh();
});

function artwork(item: Item): string | null {
    return artUrl(currentClient(), item, [
        "artworkUrl",
        "coverArtUrl",
        "coverUrl",
        "albumArtUrl",
        "imageUrl",
        "artwork",
        "coverArt",
        "image",
        "avatarUrl",
    ]);
}

function isPlaylist(item: Item): boolean {
    return text(item, ["type", "kind"]).toLowerCase().includes("playlist") ||
        Boolean(item["staticPlaylistId"] ?? item["jobId"] ?? item["tracks"]);
}

function playable(item: Item): boolean {
    return Boolean(text(item, ["streamPath", "streamUrl", "url", "path", "audioUrl"]));
}

function activate(item: Item, collection: Item[], index: number): void {
    if (isPlaylist(item)) void openPlaylist(item);
    else playCollection(collection, index);
}

function embeddedTracks(item: Item): Item[] {
    return list(item, ["tracks", "songs", "items"]);
}

function playEmbedded(item: Item): void {
    const tracks = embeddedTracks(item);
    if (tracks.length) playCollection(tracks, 0);
}

function copyLink(url: string): void {
    void navigator.clipboard?.writeText(url);
    ui.notice = "Link copied.";
}

function describeShare(item: Item): string {
    return text(item, ["url", "shareUrl", "link", "shortUrl"]);
}

function itemMeta(item: Item): string {
    const parts = [
        text(item, ["type", "kind"]),
        text(item, ["year", "releaseYear"]),
        text(item, ["trackCount", "songCount", "count"]),
        text(item, ["expiresAt", "expiry"]),
    ].filter(Boolean);
    return parts.join(" · ");
}

function requestStatus(item: Item): string {
    return text(item, ["status", "state"], "pending");
}

function personName(item: Item): string {
    return text(item, ["name", "username", "displayName", "handle"], "Someone");
}
</script>

<template>
    <ConnectPanel v-if="!connected" />

    <div v-else class="au-app">
        <div class="au-view">
            <div class="au-topbar">
                <h1 class="au-section-heading">{{ ui.view === 'home' ? 'Home' : ui.view }}</h1>
                <div class="au-topbar-spacer"></div>
                <span v-if="ui.loading" class="au-muted">Loading…</span>
            </div>

            <p v-if="ui.error" class="au-error" role="alert">{{ ui.error }}</p>
            <p v-if="ui.notice" class="au-muted">{{ ui.notice }}</p>

            <form v-if="ui.view === 'search'" class="au-search" @submit.prevent="refresh">
                <input v-model="ui.query" class="au-input" type="search" placeholder="Artists, albums, tracks…" aria-label="Search Aurral" />
                <button class="au-button" type="submit" :disabled="ui.loading">Search</button>
            </form>

            <template v-if="ui.view === 'library'">
                <div class="au-toolbar">
                    <select v-model="ui.libraryKind" class="au-input" aria-label="Library type" @change="refresh">
                        <option v-for="kind in libraryKinds" :key="kind" :value="kind">{{ kind }}</option>
                    </select>
                    <button class="au-button" type="button" :disabled="ui.page <= 1 || ui.loading" @click="ui.page--, refresh()">Previous</button>
                    <span class="au-muted">Page {{ ui.page }}</span>
                    <button class="au-button" type="button" :disabled="!ui.hasMore || ui.loading" @click="ui.page++, refresh()">Next</button>
                </div>
            </template>

            <template v-if="ui.view === 'home'">
                <section v-for="section in ui.homeSections" :key="section.title" class="au-section">
                    <h2 class="au-section-heading">{{ section.title }}</h2>
                    <div class="au-grid">
                        <div v-for="(item, index) in section.items" :key="itemId(item) || index" class="au-card" role="button" tabindex="0" @click="activate(item, section.items, index)" @keydown.enter="activate(item, section.items, index)">
                            <img v-if="artwork(item)" class="au-card-art" :src="artwork(item) ?? undefined" alt="" />
                            <div class="au-card-title">{{ itemTitle(item) }}</div>
                            <div class="au-card-subtitle">{{ itemSubtitle(item) || itemMeta(item) }}</div>
                        </div>
                    </div>
                </section>
                <p v-if="!ui.homeSections.length && !ui.loading" class="au-muted">Nothing to show yet. Try the library or search.</p>
            </template>

            <template v-else-if="ui.view === 'search' || ui.view === 'library'">
                <div v-if="ui.view === 'search' && !ui.query" class="au-muted">Type something to search your server.</div>
                <div v-else class="au-tracklist">
                    <div v-for="(item, index) in ui.view === 'search' ? ui.results : ui.library" :key="itemId(item) || index" class="au-track" :class="{ 'is-current': false }">
                        <img v-if="artwork(item)" class="au-track-art" :src="artwork(item) ?? undefined" alt="" />
                        <span v-else class="au-track-art" aria-hidden="true">♪</span>
                        <div>
                            <div class="au-track-title">{{ itemTitle(item) }}</div>
                            <div class="au-track-sub">{{ itemSubtitle(item) || itemMeta(item) }}</div>
                        </div>
                        <button v-if="embeddedTracks(item).length" class="au-button au-button--icon" type="button" @click="playEmbedded(item)">▷ All</button>
                        <button v-if="playable(item)" class="au-button au-button--icon" type="button" @click="playCollection([item], 0)">▶</button>
                        <button v-if="isPlaylist(item)" class="au-button au-button--icon" type="button" @click="openPlaylist(item)">Open</button>
                        <span v-else-if="index >= 0" class="au-track-time">{{ itemMeta(item) }}</span>
                    </div>
                </div>
                <p v-if="ui.view === 'library' && !ui.library.length && !ui.loading" class="au-muted">No items in this section.</p>
            </template>

            <template v-else-if="ui.view === 'playlists'">
                <div v-if="ui.activePlaylist" class="au-section">
                    <h2 class="au-section-heading">{{ ui.activePlaylist }}</h2>
                    <button class="au-button" type="button" @click="ui.activePlaylist = null; ui.playlistItems = []">← All playlists</button>
                    <div class="au-tracklist">
                        <div v-for="(item, index) in ui.playlistItems" :key="itemId(item) || index" class="au-track">
                            <div class="au-track-title">{{ itemTitle(item) }}</div>
                            <div class="au-track-sub">{{ itemSubtitle(item) }}</div>
                            <button v-if="playable(item)" class="au-button au-button--icon" type="button" @click="playCollection(ui.playlistItems, index)">▶</button>
                        </div>
                    </div>
                </div>
                <div v-else class="au-grid">
                    <div v-for="(item, index) in ui.playlists" :key="itemId(item) || index" class="au-card" role="button" tabindex="0" @click="openPlaylist(item)" @keydown.enter="openPlaylist(item)">
                        <img v-if="artwork(item)" class="au-card-art" :src="artwork(item) ?? undefined" alt="" />
                        <div class="au-card-title">{{ itemTitle(item) }}</div>
                        <div class="au-card-subtitle">{{ itemSubtitle(item) || itemMeta(item) }}</div>
                    </div>
                </div>
            </template>

            <template v-else-if="ui.view === 'requests'">
                <div class="au-tracklist">
                    <div v-for="(item, index) in ui.requests" :key="itemId(item) || index" class="au-track">
                        <div class="au-track-title">{{ itemTitle(item) }}</div>
                        <div class="au-track-sub">{{ itemSubtitle(item) }}</div>
                        <span class="au-badge">{{ requestStatus(item) }}</span>
                    </div>
                </div>
                <p v-if="!ui.requests.length && !ui.loading" class="au-muted">No requests.</p>
            </template>

            <template v-else-if="ui.view === 'people'">
                <div class="au-grid">
                    <div v-for="(item, index) in ui.people" :key="itemId(item) || index" class="au-card">
                        <img v-if="artwork(item)" class="au-card-art" :src="artwork(item) ?? undefined" alt="" />
                        <div class="au-card-title">{{ personName(item) }}</div>
                        <div class="au-card-subtitle">{{ text(item, ['nowPlaying', 'lastPlayed', 'status']) }}</div>
                    </div>
                </div>
                <p v-if="!ui.people.length && !ui.loading" class="au-muted">No people or friends available.</p>
            </template>

            <template v-else-if="ui.view === 'shares'">
                <div class="au-tracklist">
                    <div v-for="(item, index) in ui.shares" :key="itemId(item) || index" class="au-track">
                        <div class="au-track-title">{{ itemTitle(item) }}</div>
                        <a v-if="describeShare(item)" class="au-link" :href="describeShare(item)" target="_blank" rel="noopener noreferrer">{{ describeShare(item) }}</a>
                        <button v-if="describeShare(item)" class="au-button au-button--icon" type="button" @click="copyLink(describeShare(item))">Copy</button>
                    </div>
                </div>
                <p v-if="!ui.shares.length && !ui.loading" class="au-muted">No share links yet.</p>
            </template>
        </div>
    </div>
</template>
