<script setup lang="ts">
/**
 * A tiny icon renderer backed by Material Design Icons.
 *
 * When the host exposes its icon registry (`globalThis.__tumult.icons`, UI API
 * 1.5.0+) we ask it for the path so this pane uses the exact same library and
 * version as Tumult itself. Older hosts only publish `vue`, so the handful of
 * glyphs used here is also imported from `@mdi/js` as a fallback; Vite
 * tree-shakes everything else out of the bundle.
 */
import { ref, watchEffect } from "vue";
import {
    mdiAccountGroupOutline,
    mdiArrowDown,
    mdiArrowLeft,
    mdiArrowRight,
    mdiArrowUp,
    mdiBookshelf,
    mdiChartTimelineVariant,
    mdiClose,
    mdiCompassOutline,
    mdiDotsHorizontal,
    mdiHeart,
    mdiHeartOutline,
    mdiLinkVariant,
    mdiMagnify,
    mdiMenu,
    mdiMinus,
    mdiMusic,
    mdiOpenInNew,
    mdiPause,
    mdiPlay,
    mdiPlaylistMusic,
    mdiPlaylistPlus,
    mdiPlus,
    mdiRefresh,
    mdiShareVariant,
    mdiSkipNext,
    mdiSkipPrevious,
    mdiStop,
} from "@mdi/js";

import { hostIcons } from "../icons";

/** Semantic name → MDI kebab-case name understood by the host registry. */
const NAMES: Record<string, string> = {
    discover: "compass-outline",
    search: "magnify",
    library: "bookshelf",
    playlists: "playlist-music",
    activity: "chart-timeline-variant",
    people: "account-group-outline",
    shares: "share-variant",
    share: "share-variant",
    refresh: "refresh",
    music: "music",
    back: "arrow-left",
    forward: "arrow-right",
    dots: "dots-horizontal",
    previous: "skip-previous",
    play: "play",
    pause: "pause",
    stop: "stop",
    next: "skip-next",
    external: "open-in-new",
    menu: "menu",
    close: "close",
    plus: "plus",
    minus: "minus",
    up: "arrow-up",
    down: "arrow-down",
    heart: "heart",
    "heart-outline": "heart-outline",
    link: "link-variant",
    "queue-add": "playlist-plus",
};

/** Bundled fallback, used until the host resolves (or on hosts without it). */
const PATHS: Record<string, string> = {
    discover: mdiCompassOutline,
    search: mdiMagnify,
    library: mdiBookshelf,
    playlists: mdiPlaylistMusic,
    activity: mdiChartTimelineVariant,
    people: mdiAccountGroupOutline,
    shares: mdiShareVariant,
    share: mdiShareVariant,
    refresh: mdiRefresh,
    music: mdiMusic,
    back: mdiArrowLeft,
    forward: mdiArrowRight,
    dots: mdiDotsHorizontal,
    previous: mdiSkipPrevious,
    play: mdiPlay,
    pause: mdiPause,
    stop: mdiStop,
    next: mdiSkipNext,
    external: mdiOpenInNew,
    menu: mdiMenu,
    close: mdiClose,
    plus: mdiPlus,
    minus: mdiMinus,
    up: mdiArrowUp,
    down: mdiArrowDown,
    heart: mdiHeart,
    "heart-outline": mdiHeartOutline,
    link: mdiLinkVariant,
    "queue-add": mdiPlaylistPlus,
};

const props = defineProps<{ name: string }>();
const path = ref(PATHS[props.name] ?? "");
const viewBox = ref(24);

watchEffect((onCleanup) => {
    const fallback = PATHS[props.name] ?? "";
    path.value = fallback;
    viewBox.value = 24;

    const icons = hostIcons();
    const mdiName = NAMES[props.name];
    if (!icons || !mdiName) return;

    let stale = false;
    onCleanup(() => {
        stale = true;
    });
    void icons.resolve(mdiName).then((found) => {
        if (stale) return;
        path.value = found?.path ?? fallback;
        viewBox.value = found?.viewBox ?? 24;
    });
});
</script>

<template>
    <svg
        v-if="path"
        class="au-icon"
        :viewBox="`0 0 ${viewBox} ${viewBox}`"
        width="1em"
        height="1em"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
    >
        <path :d="path" />
    </svg>
</template>
