<script setup lang="ts">
import AuIcon from "./AuIcon.vue";
import { session } from "../aurral/session";
import { refresh, setView, ui, type View } from "../aurral/store";

const primary: Array<{ id: View; label: string; icon: string }> = [
    { id: "discover", label: "Discover", icon: "discover" },
    { id: "search", label: "Search", icon: "search" },
    { id: "library", label: "Library", icon: "library" },
    { id: "playlists", label: "Playlists", icon: "playlists" },
    { id: "activity", label: "Activity", icon: "activity" },
];

const secondary: Array<{ id: View; label: string; icon: string }> = [
    { id: "people", label: "People", icon: "people" },
    { id: "shares", label: "Share links", icon: "shares" },
];
</script>

<template>
    <nav class="au-nav">
        <div class="au-brand">
            <span class="au-brand-mark"><AuIcon name="music" /></span>
            <span>Aurral</span>
        </div>

        <div class="au-nav-section">Browse</div>
        <button
            v-for="item in primary"
            :key="item.id"
            class="au-nav-item"
            :class="{ 'is-active': item.id === ui.view }"
            type="button"
            @click="setView(item.id)"
        >
            <span class="au-nav-icon"><AuIcon :name="item.icon" /></span>
            {{ item.label }}
        </button>

        <div class="au-nav-section">More</div>
        <button
            v-for="item in secondary"
            :key="item.id"
            class="au-nav-item"
            :class="{ 'is-active': item.id === ui.view }"
            type="button"
            @click="setView(item.id)"
        >
            <span class="au-nav-icon"><AuIcon :name="item.icon" /></span>
            {{ item.label }}
        </button>

        <div class="au-nav-spacer"></div>
        <button v-if="session" class="au-nav-item" type="button" @click="refresh">
            <span class="au-nav-icon"><AuIcon name="refresh" /></span>
            Refresh
        </button>
        <div v-if="session" class="au-nav-user" :title="session.user.username">
            <span class="au-nav-avatar" aria-hidden="true">{{ session.user.username.slice(0, 1).toUpperCase() }}</span>
            <span class="au-nav-user-name">{{ session.user.username }}</span>
        </div>
    </nav>
</template>
