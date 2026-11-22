<script setup lang="ts">
import { ref } from "vue";

import { AurralClient, normaliseServerUrl } from "../aurral/client";
import { saveSession } from "../aurral/session";
import { errorText } from "../aurral/model";

const LAST_SERVER_KEY = "com.jackgraddon.tumult.aurral.last-server";

const serverUrl = ref(localStorage.getItem(LAST_SERVER_KEY) ?? "");
const username = ref("");
const password = ref("");
const busy = ref(false);
const error = ref<string | null>(null);

async function submit(): Promise<void> {
    if (!serverUrl.value.trim() || !username.value.trim() || !password.value) {
        error.value = "Enter your server address, username and password.";
        return;
    }
    busy.value = true;
    error.value = null;
    const url = normaliseServerUrl(serverUrl.value);
    try {
        // Check the address before sending credentials anywhere.
        await new AurralClient(url, "").bootstrap();
        const result = await AurralClient.login(url, username.value, password.value);
        saveSession(result);
        localStorage.setItem(LAST_SERVER_KEY, result.serverUrl);
        password.value = "";
    } catch (cause) {
        error.value = errorText(cause);
    } finally {
        busy.value = false;
    }
}
</script>

<template>
    <div class="au-connect">
        <form class="au-connect-card" @submit.prevent="submit">
            <h2>Connect to Aurral</h2>
            <p class="au-muted">
                Use your Aurral server address and the same username and password you use in the
                web client. Only a session token is kept — never your password.
            </p>
            <div class="au-field">
                <label for="au-server">Server URL</label>
                <input id="au-server" v-model="serverUrl" class="au-input" type="url" placeholder="https://music.example.com" autocomplete="url" required />
            </div>
            <div class="au-field">
                <label for="au-username">Username</label>
                <input id="au-username" v-model="username" class="au-input" type="text" autocomplete="username" required />
            </div>
            <div class="au-field">
                <label for="au-password">Password</label>
                <input id="au-password" v-model="password" class="au-input" type="password" autocomplete="current-password" required />
            </div>
            <p v-if="error" class="au-error" role="alert">{{ error }}</p>
            <button class="au-button au-button--primary" type="submit" :disabled="busy">
                {{ busy ? "Signing in…" : "Sign in" }}
            </button>
            <p class="au-muted">
                Your server must allow this Tumult origin in <code>CORS_ORIGIN</code> for the client
                to reach its API and audio streams.
            </p>
        </form>
    </div>
</template>
