/**
 * The signed-in session, shared by the pane and the settings tab.
 *
 * Only the server address and the session token are stored — never the
 * password. The token is what the app itself uses, and clearing the session is
 * just a local forget: Aurral's `/api/auth/logout` is not part of the app
 * contract, so there is nothing reliable to revoke here.
 */
import { ref, type Ref } from "vue";

import { AurralClient, normaliseServerUrl, type AurralSession } from "./client";

const STORAGE_KEY = "com.jackgraddon.tumult.aurral.session";

function load(): AurralSession | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const value = JSON.parse(raw) as Partial<AurralSession>;
        if (
            typeof value.serverUrl !== "string" ||
            typeof value.token !== "string" ||
            !value.token ||
            typeof value.user?.username !== "string"
        )
            return null;
        return {
            serverUrl: normaliseServerUrl(value.serverUrl),
            token: value.token,
            expiresAt: typeof value.expiresAt === "number" ? value.expiresAt : null,
            user: value.user as AurralSession["user"],
        };
    } catch {
        return null;
    }
}

export const session: Ref<AurralSession | null> = ref(load());

export function saveSession(next: AurralSession): void {
    const clean: AurralSession = {
        ...next,
        serverUrl: normaliseServerUrl(next.serverUrl),
    };
    session.value = clean;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch {
        // A full or locked-down localStorage must not stop sign-in: the
        // session still works for as long as the page is open.
    }
}

export function clearSession(): void {
    session.value = null;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Nothing else to do.
    }
}

/** A client for the current session, or null when signed out. */
export function currentClient(): AurralClient | null {
    const value = session.value;
    return value ? new AurralClient(value.serverUrl, value.token) : null;
}
