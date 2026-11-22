/**
 * The plugin's stylesheet, injected with `ctx.injectStylesheet()`.
 *
 * It travels inside the bundle: the release attaches only `plugin.js`, so a
 * sibling CSS file would be silently lost. Every class is prefixed `au-` to
 * stay clear of Tumult's own styles, and colours come from the shell's theme
 * tokens so custom themes blend in. No `url()` and no `@import` — the
 * installer refuses both.
 */
export const STYLESHEET = `
.au-app {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    background: var(--surface-pane);
    color: var(--text-primary);
    font-family: var(--font-sans);
}

/* ---- Page shell ------------------------------------------------------- */

.au-page {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
}

.au-page-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex: 0 0 auto;
    padding: var(--space-3) var(--space-4);
    border-bottom: var(--border-width) solid var(--border-default);
    background: var(--surface-pane);
}

.au-page-heading { min-width: 0; flex: 1 1 auto; }
.au-page-heading h1 {
    margin: 0;
    overflow: hidden;
    font-size: var(--text-xl, 1.25rem);
    font-weight: var(--weight-bold, 700);
    text-overflow: ellipsis;
    white-space: nowrap;
}
.au-eyebrow {
    color: var(--text-muted);
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold, 600);
    letter-spacing: var(--tracking-wide, 0.04em);
    text-transform: uppercase;
}
.au-page-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: 0 0 auto;
}

.au-page-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: var(--space-4);
}

/* ---- Sidebar ---------------------------------------------------------- */

.au-nav {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: var(--space-3);
}

.au-brand {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-2) var(--space-3);
    color: var(--text-primary);
    font-size: var(--text-md, 1rem);
    font-weight: var(--weight-bold, 700);
    letter-spacing: var(--tracking-wide, 0.02em);
}
.au-brand-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: var(--control-radius, var(--radius-sm));
    background: var(--accent);
    color: var(--accent-contrast, #fff);
    font-size: var(--text-sm);
}

.au-nav-section {
    padding: var(--space-3) var(--space-2) var(--space-1);
    color: var(--text-muted);
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold, 600);
    letter-spacing: var(--tracking-wide, 0.04em);
    text-transform: uppercase;
}

.au-nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 0;
    border-radius: var(--control-radius, var(--radius-sm));
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background var(--prim-motion-fast, 120ms) var(--prim-motion-ease, ease-out);
}
.au-nav-item:hover { background: var(--state-hover, var(--surface-hover)); color: var(--text-primary); }
.au-nav-item.is-active {
    background: var(--state-selected, var(--surface-active));
    color: var(--text-primary);
    font-weight: var(--weight-semibold, 600);
}
.au-nav-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    color: var(--text-muted);
    font-size: var(--text-md, 1rem);
}
.au-nav-item.is-active .au-nav-icon { color: var(--accent); }

.au-nav-spacer { flex: 1 1 auto; min-height: var(--space-3); }

.au-nav-user {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    overflow: hidden;
    padding: var(--space-2);
    border-top: var(--border-width) solid var(--border-default);
    color: var(--text-secondary);
    font-size: var(--text-sm);
}
.au-nav-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--surface-active, var(--surface-raised));
    color: var(--text-primary);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold, 700);
}
.au-nav-user-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* ---- Shelves, grids and cards ---------------------------------------- */

.au-shelf { margin-bottom: var(--space-5); }
.au-shelf-heading,
.au-section-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
    margin: 0 0 var(--space-3);
}
.au-shelf-heading h2,
.au-section-heading {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: var(--weight-bold, 700);
}

.au-shelf-track {
    margin: 0 calc(-1 * var(--space-4));
    padding: 0 var(--space-4) var(--space-1);
    overflow-x: auto;
    scrollbar-width: thin;
}
.au-shelf-cards {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(148px, 168px);
    gap: var(--space-3);
}

.au-section { margin-bottom: var(--space-5); }

.au-grid--cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: var(--space-3);
}

.au-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
    padding: var(--space-2);
    border: var(--border-width) solid transparent;
    border-radius: var(--radius-md, var(--radius-sm));
    background: var(--surface-raised);
    color: var(--text-primary);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition:
        background var(--prim-motion-fast, 120ms) var(--prim-motion-ease, ease-out),
        border-color var(--prim-motion-fast, 120ms) var(--prim-motion-ease, ease-out);
}
.au-card:hover,
.au-card:focus-visible {
    background: var(--state-hover, var(--surface-hover));
    border-color: var(--border-default);
}
.au-card:focus-visible { outline: 2px solid var(--focus-ring, var(--accent)); outline-offset: 1px; }

.au-card-art-wrap {
    position: relative;
    overflow: hidden;
    border-radius: var(--radius-sm);
    background: var(--surface-inset, var(--surface-overlay));
    aspect-ratio: 1;
}
.au-card-art {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform var(--prim-motion-base, 200ms) var(--prim-motion-ease, ease-out);
}
.au-card-art--empty {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 2rem;
}
.au-card:hover .au-card-art { transform: scale(1.03); }

.au-card-play {
    position: absolute;
    right: var(--space-2);
    bottom: var(--space-2);
    opacity: 0;
    transform: translateY(4px);
    transition:
        opacity var(--prim-motion-fast, 120ms) var(--prim-motion-ease, ease-out),
        transform var(--prim-motion-fast, 120ms) var(--prim-motion-ease, ease-out);
}
.au-card:hover .au-card-play,
.au-card:focus-within .au-card-play {
    opacity: 1;
    transform: translateY(0);
}

.au-card-title {
    overflow: hidden;
    color: var(--text-primary);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold, 600);
    text-overflow: ellipsis;
    white-space: nowrap;
}
.au-card-subtitle {
    overflow: hidden;
    color: var(--text-secondary);
    font-size: var(--text-xs);
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Person cards (People view) */
.au-card--person { align-items: center; text-align: center; }
.au-person-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--surface-active, var(--surface-raised));
    color: var(--text-primary);
    font-size: var(--text-lg);
    font-weight: var(--weight-bold, 700);
}

/* ---- Track rows ------------------------------------------------------- */

.au-tracklist { display: flex; flex-direction: column; }

.au-track {
    display: grid;
    grid-template-columns: 32px auto minmax(0, 1fr) auto auto auto;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    border-radius: var(--control-radius, var(--radius-sm));
    color: var(--text-primary);
    cursor: pointer;
    transition: background var(--prim-motion-fast, 120ms) var(--prim-motion-ease, ease-out);
}
.au-track:hover { background: var(--state-hover, var(--surface-hover)); }
.au-track:focus-visible { outline: 2px solid var(--focus-ring, var(--accent)); outline-offset: -2px; }
.au-track.is-current { background: var(--state-selected, var(--surface-active)); }
.au-track.is-current .au-track-title { color: var(--accent); }

.au-track-index {
    color: var(--text-muted);
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
    text-align: center;
}
.au-track-art {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-xs);
    object-fit: cover;
    background: var(--surface-inset, var(--surface-overlay));
}
.au-track-main { min-width: 0; }
.au-track-title {
    overflow: hidden;
    font-size: var(--text-sm);
    font-weight: var(--weight-medium, 500);
    text-overflow: ellipsis;
    white-space: nowrap;
}
.au-track-sub {
    overflow: hidden;
    color: var(--text-secondary);
    font-size: var(--text-xs);
    text-overflow: ellipsis;
    white-space: nowrap;
}
.au-track-time {
    color: var(--text-muted);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;
}
.au-track .au-button { opacity: 0.55; }
.au-track:hover .au-button,
.au-track:focus-within .au-button { opacity: 1; }

/* ---- Detail hero ------------------------------------------------------ */

.au-detail-hero {
    display: flex;
    align-items: flex-end;
    gap: var(--space-4);
    padding: var(--space-4);
    margin-bottom: var(--space-5);
    border-radius: var(--radius-md);
    background: linear-gradient(
        180deg,
        var(--surface-raised) 0%,
        var(--surface-pane) 100%
    );
    border: var(--border-width) solid var(--border-default);
}
.au-detail-art {
    flex: 0 0 auto;
    width: 148px;
    height: 148px;
    border-radius: var(--radius-sm);
    object-fit: cover;
    background: var(--surface-inset, var(--surface-overlay));
    box-shadow: var(--shadow-md, 0 8px 24px rgb(0 0 0 / 25%));
}
.au-detail-art--empty {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 3rem;
}
.au-detail-info { min-width: 0; flex: 1 1 auto; }
.au-detail-kind {
    color: var(--text-muted);
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold, 600);
    letter-spacing: var(--tracking-wide, 0.04em);
    text-transform: uppercase;
}
.au-detail-info h2 {
    margin: var(--space-1) 0;
    overflow: hidden;
    font-size: var(--text-2xl, 1.75rem);
    font-weight: var(--weight-bold, 700);
    text-overflow: ellipsis;
    white-space: nowrap;
}
.au-detail-info p {
    margin: 0 0 var(--space-3);
    color: var(--text-secondary);
    font-size: var(--text-sm);
}
.au-detail-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }

/* ---- Toolbars, tabs, chips ------------------------------------------- */

.au-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
}
.au-toolbar-spacer { flex: 1 1 auto; }

.au-tab-row { display: flex; gap: var(--space-1); }
.au-tab {
    padding: var(--space-2) var(--space-3);
    border: 0;
    border-radius: var(--control-radius, var(--radius-sm));
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: var(--text-sm);
    font-weight: var(--weight-medium, 500);
    text-transform: capitalize;
    cursor: pointer;
}
.au-tab:hover { background: var(--state-hover, var(--surface-hover)); color: var(--text-primary); }
.au-tab.is-active {
    background: var(--state-selected, var(--surface-active));
    color: var(--text-primary);
    font-weight: var(--weight-semibold, 600);
}

.au-chip-row { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-4); }
.au-chip {
    padding: var(--space-1) var(--space-3);
    border: var(--border-width) solid var(--border-default);
    border-radius: var(--control-radius, 999px);
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: var(--text-xs);
    cursor: pointer;
}
.au-chip:hover { background: var(--state-hover, var(--surface-hover)); color: var(--text-primary); }
.au-chip.is-active {
    border-color: var(--accent);
    background: var(--state-selected, var(--surface-active));
    color: var(--text-primary);
}

.au-inline-field {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    cursor: pointer;
}

.au-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    margin-top: var(--space-4);
    padding-top: var(--space-3);
    border-top: var(--border-width) solid var(--border-default);
}

/* ---- Controls --------------------------------------------------------- */

.au-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    border: var(--border-width) solid var(--border-default);
    border-radius: var(--control-radius, var(--radius-sm));
    background: var(--button-secondary-bg, var(--surface-raised));
    color: var(--button-secondary-text, var(--text-primary));
    font: inherit;
    font-size: var(--text-sm);
    font-weight: var(--weight-medium, 500);
    cursor: pointer;
    transition:
        background var(--prim-motion-fast, 120ms) var(--prim-motion-ease, ease-out),
        border-color var(--prim-motion-fast, 120ms) var(--prim-motion-ease, ease-out);
}
.au-button:hover:not(:disabled) {
    background: var(--button-secondary-bg-hover, var(--state-hover, var(--surface-hover)));
    border-color: var(--border-strong, var(--border-default));
}
.au-button:focus-visible { outline: 2px solid var(--focus-ring, var(--accent)); outline-offset: 1px; }
.au-button:disabled { opacity: var(--state-disabled-opacity, 0.5); cursor: default; }
.au-button--primary {
    border-color: transparent;
    background: var(--accent);
    color: var(--accent-contrast, #fff);
}
.au-button--primary:hover:not(:disabled) {
    background: var(--accent-hover, var(--accent));
    border-color: transparent;
}
.au-button--icon {
    min-width: 32px;
    min-height: 32px;
    padding: var(--space-1) var(--space-2);
    background: transparent;
    border-color: transparent;
}
.au-button--icon:hover:not(:disabled) { background: var(--state-hover, var(--surface-hover)); border-color: transparent; }

.au-link { color: var(--accent); font-size: var(--text-sm); }
.au-link-button {
    padding: 0;
    border: 0;
    background: none;
    color: var(--accent);
    font: inherit;
    font-size: inherit;
    text-decoration: underline;
    cursor: pointer;
}

.au-input {
    padding: var(--space-2) var(--space-3);
    border: var(--border-width) solid var(--border-default);
    border-radius: var(--control-radius, var(--radius-sm));
    background: var(--surface-inset, var(--surface-base, transparent));
    color: var(--text-primary);
    font: inherit;
    font-size: var(--text-sm);
}
.au-input::placeholder { color: var(--text-muted); }
.au-input:focus {
    outline: 2px solid var(--focus-ring, var(--accent));
    outline-offset: -1px;
    border-color: transparent;
}
.au-input--compact { max-width: 180px; }
.au-input--search { flex: 1 1 auto; min-width: 0; }

.au-search { display: flex; gap: var(--space-2); align-items: center; }
.au-search--header { min-width: 260px; }
.au-search--page { max-width: 560px; margin-bottom: var(--space-4); }

.au-badge {
    padding: 2px var(--space-2);
    border-radius: var(--control-radius, 999px);
    background: var(--surface-active, var(--surface-raised));
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium, 500);
    white-space: nowrap;
}

/* ---- States ----------------------------------------------------------- */

.au-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-6, 3rem) var(--space-4);
    text-align: center;
}
.au-empty h2 { margin: 0; font-size: var(--text-lg); font-weight: var(--weight-semibold, 600); }
.au-empty p { margin: 0; max-width: 420px; }

.au-error { color: var(--danger, #f87171); font-size: var(--text-sm); }
.au-notice {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    margin-bottom: var(--space-3);
    border: var(--border-width) solid var(--border-default);
    border-radius: var(--control-radius, var(--radius-sm));
    background: var(--surface-raised);
    color: var(--text-secondary);
    font-size: var(--text-sm);
}
.au-muted { color: var(--text-muted); font-size: var(--text-sm); }

/* ---- Player footer ---------------------------------------------------- */

.au-player {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex: 0 0 auto;
    padding: var(--space-2) var(--space-4);
    border-top: var(--border-width) solid var(--border-default);
    background: var(--surface-raised);
    min-height: 64px;
}

.au-player-art {
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    border-radius: var(--radius-xs);
    object-fit: cover;
    background: var(--surface-inset, var(--surface-overlay));
}
.au-player-info { flex: 0 1 200px; min-width: 0; }
.au-player-title,
.au-player-artist {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.au-player-title { font-size: var(--text-sm); font-weight: var(--weight-semibold, 600); }
.au-player-artist { color: var(--text-secondary); font-size: var(--text-xs); }

.au-player-controls { display: flex; align-items: center; gap: var(--space-1); flex: 0 0 auto; }
.au-player-controls .au-button--primary { min-width: 36px; min-height: 36px; border-radius: 50%; }

.au-player-timeline {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: 1 1 auto;
    min-width: 120px;
}
.au-player-time {
    color: var(--text-muted);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;
    flex: 0 0 auto;
}

.au-player-progress,
.au-player-volume {
    appearance: none;
    -webkit-appearance: none;
    height: 4px;
    border-radius: 999px;
    background: var(--surface-inset, var(--border-default));
    cursor: pointer;
    accent-color: var(--accent);
}
.au-player-progress { flex: 1 1 auto; min-width: 80px; }
.au-player-volume { width: 88px; flex: 0 0 auto; }
.au-player-progress::-webkit-slider-thumb,
.au-player-volume::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border: 0;
    border-radius: 50%;
    background: var(--text-primary);
}
.au-player-progress::-moz-range-thumb,
.au-player-volume::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border: 0;
    border-radius: 50%;
    background: var(--text-primary);
}

.au-player-actions { display: flex; align-items: center; gap: var(--space-1); flex: 0 0 auto; }

/* ---- Connect screen --------------------------------------------------- */

.au-connect {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex: 1 1 auto;
    gap: var(--space-3);
    padding: var(--space-5);
    background: var(--surface-pane);
}
.au-connect-card {
    width: 100%;
    max-width: 400px;
    padding: var(--space-5);
    border: var(--border-width) solid var(--border-default);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
}
.au-connect-card h2 { margin: 0 0 var(--space-2); font-size: var(--text-lg); font-weight: var(--weight-bold, 700); }
.au-connect-card .au-button { width: 100%; margin-top: var(--space-2); }

/* ---- Settings tab ----------------------------------------------------- */

.au-settings {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-width: 560px;
}
.au-settings h2 { margin: 0; font-size: var(--text-lg); font-weight: var(--weight-bold, 700); }
.au-settings-actions { display: flex; gap: var(--space-2); }
.au-field { display: flex; flex-direction: column; gap: var(--space-1); }
.au-field label { color: var(--text-secondary); font-size: var(--text-sm); font-weight: var(--weight-medium, 500); }
.au-settings code {
    padding: 1px 5px;
    border-radius: var(--radius-xs);
    background: var(--surface-inset, var(--surface-active));
    font-size: 0.9em;
}

/* ---- Rich activity (member rows, user bar, profile cards) ------------- */

.au-activity { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.au-activity-art { width: 20px; height: 20px; border-radius: var(--radius-xs); object-fit: cover; }
.au-activity-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.au-activity-card { display: flex; flex-direction: column; gap: var(--space-2); }
.au-activity-media { display: flex; gap: var(--space-2); }
.au-activity-media img { max-width: 56px; max-height: 56px; border-radius: var(--radius-sm); object-fit: cover; }
.au-activity-card-body { min-width: 0; }
.au-activity--row,
.au-activity--self { max-width: 100%; overflow: hidden; white-space: nowrap; }
.au-activity-headline {
    overflow: hidden;
    color: var(--text-primary);
    font-size: var(--text-sm);
    text-overflow: ellipsis;
    white-space: nowrap;
}
.au-activity-secondary {
    overflow: hidden;
    color: var(--text-secondary);
    font-size: var(--text-xs);
    text-overflow: ellipsis;
    white-space: nowrap;
}
.au-activity-progress {
    height: 4px;
    margin-top: var(--space-1);
    overflow: hidden;
    border-radius: var(--control-radius, 4px);
    background: var(--surface-inset, var(--surface-raised));
}
.au-activity-progress-fill { height: 100%; background: var(--accent); }
.au-activity-progress-time {
    color: var(--text-muted);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;
}
.au-activity-links { display: flex; gap: var(--space-2); }
.au-activity-links a {
    padding: var(--space-1) var(--space-2);
    border: var(--border-width) solid var(--button-secondary-border, var(--border-default));
    border-radius: var(--control-radius, var(--radius-sm));
    background: var(--button-secondary-bg, var(--surface-raised));
    color: var(--button-secondary-text, var(--accent));
    font-size: var(--text-xs);
    text-decoration: none;
}
.au-activity-links a:hover { background: var(--button-secondary-bg-hover, var(--state-hover, var(--surface-hover))); }

/* Narrow panes: drop the least important player chrome first. */
@media (max-width: 720px) {
    .au-player-volume,
    .au-player-actions .au-player-volume-label { display: none; }
    .au-search--header { min-width: 160px; }
    .au-detail-art { width: 104px; height: 104px; }
}
`;
