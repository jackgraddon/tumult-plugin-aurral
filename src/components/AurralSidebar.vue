<script setup lang="ts">
import { session } from "../aurral/session";
import { refresh, setView, ui, type View } from "../aurral/store";

const items: Array<{ id: View; label: string; icon: string }> = [
    { id: "home", label: "Home", icon: "⌂" },
    { id: "search", label: "Search", icon: "⌕" },
    { id: "library", label: "Library", icon: "▤" },
    { id: "playlists", label: "Playlists", icon: "☰" },
    { id: "requests", label: "Requests", icon: "↓" },
    { id: "people", label: "People", icon: "☺" },
    { id: "shares", label: "Share links", icon: "↗" },
];
</script>

<template>
    <nav class="au-nav">
        <div class="au-brand">Aurral</div>
        <button
            v-for="item in items"
            :key="item.id"
            class="au-nav-item"
            :class="{ 'is-active': item.id === ui.view }"
            type="button"
            @click="setView(item.id)"
        >
            <span aria-hidden="true">{{ item.icon }}</span>
            {{ item.label }}
        </button>
        <div class="au-nav-spacer"></div>
        <button v-if="session" class="au-nav-item" type="button" @click="refresh">↻ Refresh</button>
        <div v-if="session" class="au-muted au-nav-user" :title="session.user.username">
            {{ session.user.username }}
        </div>
    </nav>
</template>
