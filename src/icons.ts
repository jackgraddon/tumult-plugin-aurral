/**
 * Access to the host's icon library, when the running Tumult is new enough.
 *
 * Older hosts expose only `globalThis.__tumult.vue`, so callers must keep a
 * local fallback. This helper is deliberately tiny and total: a missing global
 * is an ordinary "use the fallback" answer, never an exception.
 */
import type { PluginIconApi } from "@tumult/ui";

interface TumultGlobals {
    icons?: PluginIconApi;
    [key: string]: unknown;
}

export function hostIcons(): PluginIconApi | null {
    const globals = globalThis as typeof globalThis & { __tumult?: TumultGlobals };
    return globals.__tumult?.icons ?? null;
}
