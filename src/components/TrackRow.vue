<script setup lang="ts">
import { computed } from "vue";

import { currentClient } from "../aurral/session";
import { artUrl } from "../aurral/model";
import { currentTrack, state } from "../aurral/player";
import { itemArtwork, itemDuration, itemStatus, itemSubtitle, itemTitle, type Item } from "../aurral/store";
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
        <img v-if="showArtwork !== false && artwork" class="au-track-art" :src="artwork" alt="" />
        <div class="au-track-main">
            <div class="au-track-title" :title="title">{{ title }}</div>
            <div class="au-track-sub" :title="subtitle">{{ subtitle }}</div>
        </div>
        <span v-if="status" class="au-badge">{{ status }}</span>
        <span class="au-track-time">{{ duration }}</span>
        <button class="au-button au-button--icon" type="button" :aria-label="`Play ${title}`" @click.stop="emit('play', item)"><AuIcon name="play" /></button>
        <button class="au-button au-button--icon" type="button" aria-label="Open details" @click.stop="emit('open', item)"><AuIcon name="dots" /></button>
    </div>
</template>
