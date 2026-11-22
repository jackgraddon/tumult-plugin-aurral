<script setup lang="ts">
import { session } from "../aurral/session";
import { refresh, setView, ui, type View } from "../aurral/store";

const primary: Array<{ id: View; label: string; icon: string }> = [
    { id: "discover", label: "Discover", icon: "⌂" },
    { id: "search", label: "Search", icon: "⌕" },
    { id: "library", label: "Library", icon: "▤" },
    { id: "playlists", label: "Playlists", icon: "☰" },
    { id: "activity", label: "Activity", icon: "↗" },
];

const secondary: Array<{ id: View; label: string; icon: string }> = [
    { id: "people", label: "People", icon: "☺" },
    { id: "shares", label: "Share links", icon: "↗" },
];
</script>

<template>
    <nav class="au-nav">
        <div class="au-brand">
            <span class="au-brand-mark" aria-hidden="true">♫</span>
            <span>Aurral</span>
        </div>

        <div class="au-nav-section">Browse</div>
        <button
            v-for="item in primary"
            :key="item.id"
            class="au-nav-item"
            :class="{ 'is-active': item.id === ui.view && !ui.detail }"
            type="button"
            @click="setView(item.id)"
        >
            <span class="au-nav-icon" aria-hidden="true">{{ item.icon }}</span>
            {{ item.label }}
        </button>

        <div class="au-nav-section">More</div>
        <button
            v-for="item in secondary"
            :key="item.id"
            class="au-nav-item"
            :class="{ 'is-active': item.id === ui.view && !ui.detail }"
            type="button"
            @click="setView(item.id)"
        >
            <span class="au-nav-icon" aria-hidden="true">{{ item.icon }}</span>
            {{ item.label }}
        </button>

        <div class="au-nav-spacer"></div>
        <button v-if="session" class="au-nav-item" type="button" @click="refresh">↻ Refresh</button>
        <div v-if="session" class="au-nav-user" :title="session.user.username">
            <span class="au-nav-avatar" aria-hidden="true">{{ session.user.username.slice(0, 1).toUpperCase() }}</span>
            <span class="au-nav-user-name">{{ session.user.username }}</span>
        </div>
    </nav>
</template>
