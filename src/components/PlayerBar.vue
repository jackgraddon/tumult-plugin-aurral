<script setup lang="ts">
import { computed } from "vue";

import { currentTrack, state, toggle, next, previous, seek, setVolume } from "../aurral/player";
import { squiglyUrl } from "../aurral/status";
import { formatTime } from "../aurral/model";
import AuIcon from "./AuIcon.vue";

const track = currentTrack;
const link = computed(() => (track.value ? squiglyUrl(track.value) : null));
const duration = computed(() => state.durationMs || track.value?.durationMs || 0);
const progressFill = computed(() =>
    duration.value > 0
        ? Math.min(100, Math.max(0, (state.positionMs / duration.value) * 100))
        : 0,
);
const volumeFill = computed(() => Math.min(100, Math.max(0, state.volume * 100)));

function onSeek(event: Event): void {
    seek(Number((event.target as HTMLInputElement).value));
}
function onVolume(event: Event): void {
    setVolume(Number((event.target as HTMLInputElement).value) / 100);
}
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
                    <button class="au-button au-button--icon" type="button" aria-label="Previous track" @click="previous"><AuIcon name="previous" /></button>
                    <button class="au-button au-button--primary au-button--icon" type="button" :aria-label="state.playing ? 'Pause' : 'Play'" :disabled="state.loading" @click="toggle">
                        <AuIcon :name="state.playing ? 'pause' : 'play'" />
                    </button>
                    <button class="au-button au-button--icon" type="button" aria-label="Next track" @click="next"><AuIcon name="next" /></button>
                </div>
                <a v-if="link" class="au-player-share au-button au-button--icon" :href="link" target="_blank" rel="noopener noreferrer" title="Share on Squigly"><AuIcon name="share" /></a>
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
    </div>
</template>
