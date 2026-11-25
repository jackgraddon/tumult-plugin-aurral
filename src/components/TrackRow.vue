<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";

import { currentClient } from "../aurral/session";
import { artUrl } from "../aurral/model";
import { currentTrack, state } from "../aurral/player";
import {
    enqueueItem,
    itemArtwork,
    itemDuration,
    itemStatus,
    itemSubtitle,
    itemTitle,
    ui,
    type Item,
} from "../aurral/store";
import { shareToAurral, shareToSquigly } from "../aurral/share";
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
const isPreview = computed(() => props.item.isPreview === true);
const artwork = computed(() => artUrl(currentClient(), itemArtwork(props.item), ART_KEYS));
const isCurrent = computed(() => {
    const current = currentTrack.value;
    if (!current) return false;
    const id = props.item.id ?? props.item.trackId;
    return id !== undefined && String(id) === String(current.id ?? current.trackId);
});

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
    const estimatedHeight = 230;
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

function menuQueue(): void {
    closeMenu();
    const added = enqueueItem(props.item);
    ui.notice = added ? `Added ${added} track${added === 1 ? "" : "s"} to the queue.` : "No playable stream to queue.";
}

function menuShareSquigly(): void {
    closeMenu();
    shareToSquigly(props.item);
}

async function menuShareAurral(): Promise<void> {
    closeMenu();
    await shareToAurral(props.item);
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
            <span v-if="isPreview" class="au-badge">Preview</span>
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
                <button class="au-menu-item" type="button" role="menuitem" @click="menuQueue">
                    <AuIcon name="queue-add" /> Add to queue
                </button>
                <div class="au-menu-label" role="presentation">Share with…</div>
                <button class="au-menu-item" type="button" role="menuitem" @click="menuShareSquigly">
                    <AuIcon name="share" /> Squigly
                </button>
                <button class="au-menu-item" type="button" role="menuitem" @click="menuShareAurral">
                    <AuIcon name="link" /> Aurral
                </button>
            </div>
        </Teleport>
    </div>
</template>
