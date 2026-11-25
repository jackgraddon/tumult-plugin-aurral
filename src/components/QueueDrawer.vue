<script setup lang="ts">
/** Right-hand queue drawer, opened from the now-playing bar. */
import { computed, onBeforeUnmount, onMounted } from "vue";

import { formatTime } from "../aurral/model";
import {
    clearQueue,
    currentTrack,
    moveQueueItem,
    queueOpen,
    removeQueueItem,
    state,
    playAt,
} from "../aurral/player";
import AuIcon from "./AuIcon.vue";

const rows = computed(() => state.tracks.map((track, index) => ({ track, index })));

function close(): void {
    queueOpen.value = false;
}

function onKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape" && queueOpen.value) close();
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
</script>

<template>
    <Teleport to="body">
        <div v-if="queueOpen" class="au-queue-layer">
            <div class="au-queue-backdrop" aria-hidden="true" @click="close"></div>
            <aside class="au-queue-drawer" role="dialog" aria-label="Play queue">
                <header class="au-queue-header">
                    <div>
                        <h2>Queue</h2>
                        <span class="au-muted">{{ rows.length }} track{{ rows.length === 1 ? "" : "s" }}</span>
                    </div>
                    <button class="au-button au-button--icon" type="button" aria-label="Close queue" @click="close">
                        <AuIcon name="close" />
                    </button>
                </header>

                <div v-if="rows.length" class="au-queue-actions">
                    <button class="au-button" type="button" :disabled="!rows.length" @click="clearQueue">
                        <AuIcon name="minus" /> Clear queue
                    </button>
                </div>

                <div class="au-queue-list">
                    <div
                        v-for="row in rows"
                        :key="`${row.index}:${row.track.title}`"
                        class="au-queue-row"
                        :class="{ 'is-current': currentTrack === row.track }"
                    >
                        <button class="au-queue-main" type="button" :aria-label="`Play ${row.track.title}`" @click="playAt(row.index)">
                            <img v-if="row.track.artworkUrl" class="au-queue-art" :src="row.track.artworkUrl" alt="" />
                            <span v-else class="au-queue-art au-queue-art--empty" aria-hidden="true"><AuIcon name="music" /></span>
                            <span class="au-queue-copy">
                                <span class="au-queue-title">{{ row.track.title }}</span>
                                <span class="au-queue-artist">{{ row.track.artistName }}</span>
                            </span>
                        </button>
                        <span class="au-queue-time">{{ formatTime(row.track.durationMs ?? 0) }}</span>
                        <div class="au-queue-row-actions">
                            <button class="au-button au-button--icon" type="button" aria-label="Move up" :disabled="row.index === 0" @click="moveQueueItem(row.index, -1)"><AuIcon name="up" /></button>
                            <button class="au-button au-button--icon" type="button" aria-label="Move down" :disabled="row.index === rows.length - 1" @click="moveQueueItem(row.index, 1)"><AuIcon name="down" /></button>
                            <button class="au-button au-button--icon" type="button" :aria-label="`Remove ${row.track.title}`" @click="removeQueueItem(row.index)"><AuIcon name="close" /></button>
                        </div>
                    </div>
                </div>

                <div v-if="!rows.length" class="au-empty">
                    <h2>Nothing queued</h2>
                    <p class="au-muted">Use a track's three-dot menu to add it to the queue.</p>
                </div>
            </aside>
        </div>
    </Teleport>
</template>
