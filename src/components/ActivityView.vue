<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { ActivityVariant } from "@tumult/ui";

import { isListeningActivity, type ListeningActivity } from "../aurral/status";
import { formatTime } from "../aurral/model";

const props = defineProps<{
    userId: string;
    value: unknown;
    variant: ActivityVariant;
}>();

const activity = computed<ListeningActivity | null>(() =>
    isListeningActivity(props.value) ? props.value : null,
);
const artwork = computed(() => activity.value?.media[0]?.url ?? null);
const artistImage = computed(() => activity.value?.media[1]?.url ?? null);
const link = computed(() => activity.value?.buttons[0] ?? null);

const now = ref(Date.now());
let timer: number | undefined;
onMounted(() => {
    timer = window.setInterval(() => {
        now.value = Date.now();
    }, 1000);
});
onUnmounted(() => {
    if (timer !== undefined) window.clearInterval(timer);
});

const progress = computed(() => {
    const item = activity.value;
    if (!item?.endsAt || item.endsAt <= item.startedAt) return 0;
    return Math.max(0, Math.min(100, ((now.value - item.startedAt) / (item.endsAt - item.startedAt)) * 100));
});
const elapsed = computed(() => Math.max(0, now.value - (activity.value?.startedAt ?? now.value)));
const remaining = computed(() => {
    const ends = activity.value?.endsAt;
    return ends ? Math.max(0, ends - now.value) : 0;
});
const compactLabel = computed(() => {
    const item = activity.value;
    if (!item) return "";
    return [item.name, item.details].filter(Boolean).join(" — ");
});
</script>

<template>
    <span v-if="activity && variant !== 'card'" class="au-activity" :title="compactLabel">
        <span aria-hidden="true">{{ activity.emoji || "🎵" }}</span>
        <span class="au-activity-text">Listening to {{ compactLabel }}</span>
    </span>

    <div v-else-if="activity" class="au-activity-card" :title="`${activity.details} — ${activity.state}`">
        <div class="au-activity-media">
            <img v-if="artwork" :src="artwork" :alt="`${activity.name} cover art`" />
            <img v-if="artistImage && artistImage !== artwork" :src="artistImage" :alt="`${activity.details} artist image`" />
        </div>
        <div class="au-activity-card-body">
            <div class="au-activity-headline">
                {{ activity.emoji || "🎵" }} Listening to <strong>{{ activity.name }}</strong>
            </div>
            <div v-if="activity.details || activity.state" class="au-activity-secondary">
                {{ [activity.details, activity.state].filter(Boolean).join(" · ") }}
            </div>
            <div v-if="activity.endsAt" class="au-activity-progress" role="progressbar" :aria-valuenow="Math.round(progress)" aria-valuemin="0" aria-valuemax="100">
                <div class="au-activity-progress-fill" :style="{ width: `${progress}%` }"></div>
            </div>
            <div v-if="activity.endsAt" class="au-activity-progress-time">
                {{ formatTime(elapsed) }} / {{ formatTime((activity.endsAt ?? 0) - activity.startedAt) }} · {{ formatTime(remaining) }} left
            </div>
            <div v-if="link" class="au-activity-links">
                <a :href="link.url" target="_blank" rel="noopener noreferrer nofollow" referrerpolicy="no-referrer">{{ link.label }}</a>
            </div>
        </div>
    </div>
</template>
