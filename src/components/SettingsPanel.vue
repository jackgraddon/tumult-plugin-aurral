<script setup lang="ts">
import { computed, ref } from "vue";

import { clearSession, session } from "../aurral/session";
import { clearListening } from "../aurral/status";
import { disposePlayer } from "../aurral/player";
import { ui } from "../aurral/store";

const serverUrl = ref(localStorage.getItem("com.jackgraddon.tumult.aurral.last-server") ?? session.value?.serverUrl ?? "");
const notice = ref<string | null>(null);
const connected = computed(() => session.value !== null);

function saveServer(): void {
    localStorage.setItem("com.jackgraddon.tumult.aurral.last-server", serverUrl.value.trim());
    notice.value = "Server address saved. Sign in again to use it.";
}

function signOut(): void {
    disposePlayer();
    void clearListening();
    clearSession();
    ui.shelves = [];
    ui.searchGroups = [];
    ui.library = [];
    ui.playlists = [];
    ui.flows = [];
    ui.detail = null;
    notice.value = "Signed out of Aurral.";
}
</script>

<template>
    <div class="au-settings">
        <h2>Aurral</h2>
        <p class="au-muted">
            The player runs against your own Aurral server. Sign in from the Aurral pane in the
            workspace rail.
        </p>
        <div class="au-field">
            <label for="au-settings-server">Server URL</label>
            <input id="au-settings-server" v-model="serverUrl" class="au-input" type="url" />
        </div>
        <div class="au-settings-actions">
            <button class="au-button" type="button" @click="saveServer">Save address</button>
            <button class="au-button" type="button" :disabled="!connected" @click="signOut">Sign out</button>
        </div>
        <p v-if="notice" class="au-muted">{{ notice }}</p>
        <p class="au-muted">
            Server: {{ session?.serverUrl || "not connected" }}<br />
            Signed in as: {{ session?.user.username || "nobody" }}
        </p>
        <p class="au-muted">
            Aurral needs <code>CORS_ORIGIN</code> set to this Tumult origin so the plugin can call
            its API. Do not put an Aurral API key here — the plugin signs in as you, with a user
            session token.
        </p>
    </div>
</template>
