<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";

import {
    currentTrack,
    next,
    previous,
    queueOpen,
    seek,
    setVolume,
    state,
    stop,
    toggle,
} from "../aurral/player";
import { loadFavorites, isFavorite, toggleFavorite as toggleTrackFavorite } from "../aurral/library";
import { shareToAurral, shareToSquigly } from "../aurral/share";
import { ui } from "../aurral/store";
import { formatTime } from "../aurral/model";
import AuIcon from "./AuIcon.vue";
import QueueDrawer from "./QueueDrawer.vue";

const track = currentTrack;
const duration = computed(() => state.durationMs || track.value?.durationMs || 0);
const progressFill = computed(() =>
    duration.value > 0
        ? Math.min(100, Math.max(0, (state.positionMs / duration.value) * 100))
        : 0,
);
const volumeFill = computed(() => Math.min(100, Math.max(0, state.volume * 100)));
const favorite = computed(() => (track.value ? isFavorite(track.value) : false));

const menuOpen = ref(false);
const menuButton = ref<HTMLElement | null>(null);
const menuRoot = ref<HTMLElement | null>(null);
const menuStyle = ref<Record<string, string>>({});

function onSeek(event: Event): void {
    seek(Number((event.target as HTMLInputElement).value));
}
function onVolume(event: Event): void {
    setVolume(Number((event.target as HTMLInputElement).value) / 100);
}
function toggleQueue(): void {
    closeMenu();
    queueOpen.value = !queueOpen.value;
}

function toggleMenu(event: MouseEvent): void {
    if (menuOpen.value) {
        closeMenu();
        return;
    }
    const button = event.currentTarget as HTMLElement | null;
    menuButton.value = button;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const estimatedHeight = 260;
    const placeAbove = rect.bottom + estimatedHeight > window.innerHeight - 8;
    menuStyle.value = {
        top: `${placeAbove ? rect.top - 4 : rect.bottom + 4}px`,
        left: `${rect.right}px`,
        transform: `translateX(-100%)${placeAbove ? " translateY(-100%)" : ""}`,
    };
    menuOpen.value = true;
    void loadFavorites();
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

async function menuFavorite(): Promise<void> {
    closeMenu();
    if (!track.value) return;
    try {
        const starred = await toggleTrackFavorite(track.value);
        if (starred === null) ui.notice = "This preview is not in your Aurral library.";
        else ui.notice = starred ? "Added to favorites." : "Removed from favorites.";
    } catch {
        ui.notice = "Could not update favorites.";
    }
}

function menuSquigly(): void {
    closeMenu();
    if (track.value) shareToSquigly(track.value);
}

async function menuAurral(): Promise<void> {
    closeMenu();
    if (track.value) await shareToAurral(track.value);
}

onBeforeUnmount(closeMenu);
</script>

<template>
    <!-- Two rows: the pane is often narrower than a row of eight controls. -->
    <div class="au-player">
        <div class="au-player-head">
            <template v-if="track">
                <img v-if="track.artworkUrl" class="au-player-art" :src="track.artworkUrl" alt="" />
                <div class="au-player-info">
                    <div class="au-player-title" :title="track.title">{{ track.title }}</div>
                    <div class="au-player-artist" :title="track.artistName">{{ track.artistName }}</div>
                </div>
                <div class="au-player-controls">
                    <button class="au-button au-button--icon" type="button" aria-label="Stop" title="Stop" :disabled="!track" @click="stop"><AuIcon name="stop" /></button>
                    <button class="au-button au-button--icon" type="button" aria-label="Previous track" @click="previous"><AuIcon name="previous" /></button>
                    <button class="au-button au-button--primary au-button--icon" type="button" :aria-label="state.playing ? 'Pause' : 'Play'" :disabled="state.loading" @click="toggle">
                        <AuIcon :name="state.playing ? 'pause' : 'play'" />
                    </button>
                    <button class="au-button au-button--icon" type="button" aria-label="Next track" @click="next"><AuIcon name="next" /></button>
                </div>
                <div class="au-player-actions">
                    <button
                        ref="menuButton"
                        class="au-button au-button--icon"
                        type="button"
                        aria-label="Track actions"
                        title="Track actions"
                        :aria-expanded="menuOpen"
                        aria-haspopup="menu"
                        @click="toggleMenu"
                    ><AuIcon name="dots" /></button>
                    <button
                        class="au-button au-button--icon au-player-queue-button"
                        type="button"
                        :aria-label="queueOpen ? 'Hide queue' : 'Show queue'"
                        :title="queueOpen ? 'Hide queue' : 'Show queue'"
                        :aria-expanded="queueOpen"
                        @click="toggleQueue"
                    >
                        <AuIcon name="playlists" />
                        <span v-if="state.tracks.length" class="au-player-queue-count">{{ state.tracks.length }}</span>
                    </button>
                </div>
            </template>
            <span v-else class="au-muted">Nothing playing — pick something from your library.</span>
        </div>

        <div v-if="track" class="au-player-timeline">
            <span class="au-player-time">{{ formatTime(state.positionMs) }}</span>
            <input
                class="au-player-progress au-slider"
                type="range"
                min="0"
                :max="duration || 0"
                :value="state.positionMs"
                :style="{ '--au-fill': `${progressFill}%` }"
                :disabled="!duration"
                aria-label="Playback position"
                @input="onSeek"
            />
            <span class="au-player-time">{{ formatTime(duration) }}</span>
            <input
                class="au-player-volume au-slider"
                type="range"
                min="0"
                max="100"
                :value="Math.round(state.volume * 100)"
                :style="{ '--au-fill': `${volumeFill}%` }"
                aria-label="Volume"
                @input="onVolume"
            />
        </div>
        <span v-if="state.error" class="au-error" role="alert">{{ state.error }}</span>

        <Teleport to="body">
            <div v-if="menuOpen && track" ref="menuRoot" class="au-menu" :style="menuStyle" role="menu" @click.stop>
                <button class="au-menu-item" type="button" role="menuitem" @click="menuFavorite">
                    <AuIcon :name="favorite ? 'heart' : 'heart-outline'" />
                    {{ favorite ? "Remove from favorites" : "Add to favorites" }}
                </button>
                <div class="au-menu-label" role="presentation">Share with…</div>
                <button class="au-menu-item" type="button" role="menuitem" @click="menuSquigly">
                    <AuIcon name="share" /> Squigly
                </button>
                <button class="au-menu-item" type="button" role="menuitem" @click="menuAurral">
                    <AuIcon name="link" /> Aurral
                </button>
            </div>
        </Teleport>
        <QueueDrawer />
    </div>
</template>
