/**
 * Aurral, inside Tumult.
 *
 * This is a real client for Aurral's version-2 app API, not an iframe: the
 * hosted web client refuses framing, and a cross-origin frame could not tell
 * the plugin what is playing. Owning playback means the plugin always knows
 * the current track and can publish a rich now-playing status for it.
 *
 * The bundle contributes live Vue components, so it runs in the trusted lane
 * (Tumult derives that from `workspace-panes` and friends — plugins never
 * declare the lane). It shares the host's Vue instance; the build aliases
 * `vue` to the generated shim in `src/shims/vue.ts`.
 */
import type { Plugin, PluginManifest } from "@tumult/ui";

import ActivityView from "./components/ActivityView.vue";
import AurralPane from "./components/AurralPane.vue";
import AurralSidebar from "./components/AurralSidebar.vue";
import PlayerBar from "./components/PlayerBar.vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import { ACTIVITY_KEY, isListeningActivity, startStatus } from "./aurral/status";
import { disposePlayer } from "./aurral/player";
import { STYLESHEET } from "./styles";

const PANE_ID = "com.jackgraddon.tumult.aurral.pane";
const SETTINGS_ID = "com.jackgraddon.tumult.aurral.settings";

/** Keep this in step with `tumult.plugin.json` at the repository root. */
export const manifest: PluginManifest = {
    id: "com.jackgraddon.tumult.aurral",
    name: "Aurral",
    version: "0.0.4",
    author: "Jack Graddon",
    description: "Your Aurral music library in Tumult, with a rich now-playing status.",
    permissions: ["activity-renderers", "settings-tabs", "workspace-panes", "styles"],
    minUI: "1.4.1",
    minCore: "1.7.0",
};

export const plugin: Plugin = {
    manifest,

    install(ctx) {
        const disposables = [
            ctx.injectStylesheet(STYLESHEET),
            ctx.addActivityRenderer({
                id: "com.jackgraddon.tumult.aurral.activity-renderer",
                key: ACTIVITY_KEY,
                component: ActivityView,
                priority: 10,
                match: isListeningActivity,
            }),
            ctx.addSettingsTab({
                id: SETTINGS_ID,
                title: "Aurral",
                component: SettingsPanel,
                section: "plugins",
            }),
            ctx.addPane({
                id: PANE_ID,
                label: "Aurral",
                icon: "music",
                priority: 10,
                content: AurralPane,
                sidebar: AurralSidebar,
                footer: PlayerBar,
            }),
            startStatus(ctx.client),
        ];

        return () => {
            disposePlayer();
            for (const dispose of disposables) dispose();
        };
    },
};

export default plugin;
