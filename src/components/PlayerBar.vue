<script setup lang="ts">
import { computed } from "vue";

import { currentTrack, state, toggle, next, previous, seek, setVolume } from "../aurral/player";
import { squiglyUrl } from "../aurral/status";
import { formatTime } from "../aurral/model";

const track = currentTrack;
const link = computed(() => (track.value ? squiglyUrl(track.value) : null));
const duration = computed(() => state.durationMs || track.value?.durationMs || 0);

function onSeek(event: Event): void {
    seek(Number((event.target as HTMLInputElement).value));
}
function onVolume(event: Event): void {
    setVolume(Number((event.target as HTMLInputElement).value) / 100);
}
</script>

<template>
    <div class="au-player">
        <template v-if="track">
            <img v-if="track.artworkUrl" class="au-player-art" :src="track.artworkUrl" alt="" />
            <div class="au-player-info">
                <div class="au-player-title" :title="track.title">{{ track.title }}</div>
                <div class="au-player-artist" :title="track.artistName">{{ track.artistName }}</div>
            </div>
            <div class="au-player-controls">
                <button class="au-button au-button--icon" type="button" aria-label="Previous track" @click="previous">⏮</button>
                <button class="au-button au-button--primary au-button--icon" type="button" :aria-label="state.playing ? 'Pause' : 'Play'" :disabled="state.loading" @click="toggle">
                    {{ state.playing ? "⏸" : "▶" }}
                </button>
                <button class="au-button au-button--icon" type="button" aria-label="Next track" @click="next">⏭</button>
            </div>
            <span class="au-player-time">{{ formatTime(state.positionMs) }}</span>
            <input class="au-player-progress" type="range" min="0" :max="duration || 0" :value="state.positionMs" :disabled="!duration" aria-label="Playback position" @input="onSeek" />
            <span class="au-player-time">{{ formatTime(duration) }}</span>
            <input type="range" min="0" max="100" :value="Math.round(state.volume * 100)" aria-label="Volume" @input="onVolume" />
            <a v-if="link" class="au-button au-button--icon" :href="link" target="_blank" rel="noopener noreferrer" title="Open on Squigly">↗</a>
        </template>
        <span v-else class="au-muted">Nothing playing — pick something from your library.</span>
        <span v-if="state.error" class="au-error" role="alert">{{ state.error }}</span>
    </div>
</template>
