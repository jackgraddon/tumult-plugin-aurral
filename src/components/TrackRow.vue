<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";

import { currentClient } from "../aurral/session";
import { artUrl, list, record, text, withMetadata } from "../aurral/model";
import { currentTrack, state } from "../aurral/player";
import {
    itemArtwork,
    itemDuration,
    itemStatus,
    itemSubtitle,
    itemTitle,
    openDetail,
    ui,
    type Item,
} from "../aurral/store";
import { squiglyUrl } from "../aurral/status";
import AuIcon from "./AuIcon.vue";

const props = withDefaults(defineProps<{
    item: Item;
    index: number;
    showArtwork?: boolean;
}>(), {
    showArtwork: true,
});

const emit = defineEmits<{
    play: [item: Item];
    open: [item: Item];
}>();

const ART_KEYS = ["artworkUrl", "coverArtUrl", "coverUrl", "albumArtUrl", "defaultCoverUrl", "imageUrl", "artwork", "coverArt"];

const title = computed(() => itemTitle(props.item));
const subtitle = computed(() => itemSubtitle(props.item));
const duration = computed(() => itemDuration(props.item));
const status = computed(() => itemStatus(props.item));
const artwork = computed(() => artUrl(currentClient(), itemArtwork(props.item), ART_KEYS));
const isCurrent = computed(() => {
    const current = currentTrack.value;
    if (!current) return false;
    const id = props.item.id ?? props.item.trackId;
    return id !== undefined && String(id) === String(current.id ?? current.trackId);
});

/** Album/artist references carried by a track row, when the server exposes ids. */
const albumRef = computed<Item | null>(() => {
    const data = withMetadata(props.item);
    const albums = list(data, ["albums"]);
    const album = record(data.album);
    const id =
        text(data, ["albumId"]) ||
        text(album, ["id", "albumId"]) ||
        text(albums[0], ["albumId", "id"]);
    if (!id) return null;
    const name =
        text(data, ["albumName", "albumTitle"]) ||
        text(album, ["title", "name"]) ||
        text(data, ["album"]);
    return { ...data, _kind: "album", id, title: name };
});

const artistRef = computed<Item | null>(() => {
    const data = withMetadata(props.item);
    const artist = record(data.artist);
    const id = text(data, ["artistId"]) || text(artist, ["id", "artistId"]);
    if (!id) return null;
    const name =
        text(data, ["artistName", "albumArtist"]) || text(artist, ["name", "title"]);
    return { ...data, _kind: "artist", id, title: name };
});

const shareLink = computed(() => squiglyUrl({ title: title.value, artistName: subtitle.value }));

const menuOpen = ref(false);
const menuButton = ref<HTMLElement | null>(null);
const menuRoot = ref<HTMLElement | null>(null);
const menuStyle = ref<Record<string, string>>({});

function toggleMenu(event: MouseEvent): void {
    if (menuOpen.value) {
        closeMenu();
        return;
    }
    const button = event.currentTarget as HTMLElement | null;
    menuButton.value = button;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    // Rough menu height: flip above the button near the viewport bottom so the
    // popup is not clipped by the pane's scroll container.
    const estimatedHeight = 190;
    const placeAbove = rect.bottom + estimatedHeight > window.innerHeight - 8;
    menuStyle.value = {
        top: `${placeAbove ? rect.top - 4 : rect.bottom + 4}px`,
        left: `${rect.right}px`,
        transform: `translateX(-100%)${placeAbove ? " translateY(-100%)" : ""}`,
    };
    menuOpen.value = true;
    document.addEventListener("pointerdown", onDocumentPointer, true);
    document.addEventListener("keydown", onDocumentKey, true);
}

function closeMenu(): void {
    if (!menuOpen.value) return;
    menuOpen.value = false;
    document.removeEventListener("pointerdown", onDocumentPointer, true);
    document.removeEventListener("keydown", onDocumentKey, true);
}

function onDocumentPointer(event: Event): void {
    const target = event.target as Node | null;
    if (!target) return;
    if (menuRoot.value?.contains(target) || menuButton.value?.contains(target)) return;
    closeMenu();
}

function onDocumentKey(event: KeyboardEvent): void {
    if (event.key === "Escape") closeMenu();
}

onBeforeUnmount(closeMenu);

function menuPlay(): void {
    closeMenu();
    emit("play", props.item);
}

function menuOpenAlbum(): void {
    const target = albumRef.value;
    closeMenu();
    if (target) openDetail(target, "album");
}

function menuOpenArtist(): void {
    const target = artistRef.value;
    closeMenu();
    if (target) openDetail(target, "artist");
}

function menuShare(): void {
    const link = shareLink.value;
    closeMenu();
    if (link) window.open(link, "_blank", "noopener,noreferrer");
}

async function menuCopy(): Promise<void> {
    const link = shareLink.value;
    closeMenu();
    if (!link) return;
    try {
        await navigator.clipboard.writeText(link);
        ui.notice = "Share link copied.";
    } catch {
        ui.notice = "Could not copy the share link.";
    }
}
</script>

<template>
    <div
        class="au-track"
        :class="{ 'is-current': isCurrent }"
        role="button"
        tabindex="0"
        @click="emit('play', item)"
        @keydown.enter="emit('play', item)"
    >
        <span class="au-track-index">
            <AuIcon v-if="isCurrent && state.playing" name="music" />
            <span v-else>{{ index + 1 }}</span>
        </span>
        <div class="au-track-content">
            <img v-if="showArtwork !== false && artwork" class="au-track-art" :src="artwork" alt="" />
            <div class="au-track-main">
                <div class="au-track-title" :title="title">{{ title }}</div>
                <div class="au-track-sub" :title="subtitle">{{ subtitle }}</div>
            </div>
        </div>
        <div class="au-track-meta">
            <span v-if="status" class="au-badge">{{ status }}</span>
            <span class="au-track-time">{{ duration }}</span>
            <button class="au-button au-button--icon" type="button" :aria-label="`Play ${title}`" @click.stop="emit('play', item)"><AuIcon name="play" /></button>
            <button
                ref="menuButton"
                class="au-button au-button--icon"
                type="button"
                :aria-label="`Actions for ${title}`"
                :aria-expanded="menuOpen"
                aria-haspopup="menu"
                @click.stop="toggleMenu"
            ><AuIcon name="dots" /></button>
        </div>
        <Teleport to="body">
            <div v-if="menuOpen" ref="menuRoot" class="au-menu" :style="menuStyle" role="menu" @click.stop>
                <button class="au-menu-item" type="button" role="menuitem" @click="menuPlay">
                    <AuIcon name="play" /> Play
                </button>
                <button v-if="albumRef" class="au-menu-item" type="button" role="menuitem" @click="menuOpenAlbum">
                    <AuIcon name="library" /> Open album
                </button>
                <button v-if="artistRef" class="au-menu-item" type="button" role="menuitem" @click="menuOpenArtist">
                    <AuIcon name="people" /> Open artist
                </button>
                <button v-if="shareLink" class="au-menu-item" type="button" role="menuitem" @click="menuShare">
                    <AuIcon name="share" /> Share on Squigly
                </button>
                <button v-if="shareLink" class="au-menu-item" type="button" role="menuitem" @click="menuCopy">
                    <AuIcon name="dots" /> Copy link
                </button>
            </div>
        </Teleport>
    </div>
</template>
