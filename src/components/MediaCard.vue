<script setup lang="ts">
import { computed } from "vue";

import { currentClient } from "../aurral/session";
import { artUrl } from "../aurral/model";
import { itemArtwork, itemKind, itemSubtitle, itemTitle, type Item } from "../aurral/store";
import AuIcon from "./AuIcon.vue";

const props = withDefaults(defineProps<{
    item: Item;
    subtitle?: string;
    showPlay?: boolean;
}>(), {
    showPlay: true,
});

const emit = defineEmits<{
    open: [item: Item];
    play: [item: Item];
}>();

const ART_KEYS = [
    "artworkUrl",
    "coverArtUrl",
    "coverUrl",
    "albumArtUrl",
    "defaultCoverUrl",
    "imageUrl",
    "image",
    "artwork",
    "coverArt",
    "avatarUrl",
    "artistImageUrl",
];

const title = computed(() => itemTitle(props.item));
const subtitle = computed(() => props.subtitle ?? itemSubtitle(props.item));
const artwork = computed(() => artUrl(currentClient(), itemArtwork(props.item), ART_KEYS));
const kind = computed(() => itemKind(props.item));
const hasArtwork = computed(() => artwork.value !== null);
</script>

<template>
    <article
        class="au-card"
        :class="{ 'au-card--playlist': kind === 'playlist' }"
        role="button"
        tabindex="0"
        @click="emit('open', item)"
        @keydown.enter="emit('open', item)"
    >
        <div class="au-card-art-wrap">
            <img v-if="artwork" class="au-card-art" :src="artwork" :alt="`${title} artwork`" />
            <div v-else class="au-card-art au-card-art--empty" aria-hidden="true"><AuIcon name="music" /></div>
            <button
                v-if="showPlay !== false"
                class="au-card-play au-button au-button--primary"
                type="button"
                :aria-label="`Play ${title}`"
                @click.stop="emit('play', item)"
            ><AuIcon name="play" /></button>
        </div>
        <div class="au-card-title" :title="title">{{ title }}</div>
        <div class="au-card-subtitle" :title="subtitle">{{ subtitle }}</div>
    </article>
</template>
