/**
 * The plugin's stylesheet, injected with `ctx.injectStylesheet()`.
 *
 * It travels inside the bundle: the release attaches only `plugin.js`, so a
 * sibling CSS file would be silently lost. Every class is prefixed `au-` to
 * stay clear of Tumult's own styles, and colours come from the shell's theme
 * tokens. No `url()` and no `@import` — the installer refuses both.
 */
export const STYLESHEET = `
.au-app {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    background: var(--timeline-bg, var(--surface-base, transparent));
    color: var(--text-primary);
    font-family: var(--font-sans);
}

.au-topbar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-4);
    border-bottom: var(--border-width) solid var(--border-default);
    background: var(--surface-pane);
}

.au-brand {
    font-weight: var(--weight-bold, 700);
    letter-spacing: var(--tracking-wide);
}

.au-topbar-spacer { flex: 1; }

.au-main {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
}

.au-nav {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    flex: 0 0 160px;
    padding: var(--space-3);
    border-right: var(--border-width) solid var(--border-default);
    overflow-y: auto;
}

.au-nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.au-nav-item:hover { background: var(--surface-hover, var(--surface-raised)); }
.au-nav-item.is-active {
    background: var(--surface-selected, var(--accent-subtle));
    color: var(--text-primary);
}

.au-view {
    flex: 1 1 auto;
    min-width: 0;
    overflow-y: auto;
    padding: var(--space-4);
}

.au-hero {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4);
    margin-bottom: var(--space-4);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
}

.au-hero-art {
    width: 96px;
    height: 96px;
    border-radius: var(--radius-sm);
    object-fit: cover;
    background: var(--surface-overlay);
}

.au-section { margin-bottom: var(--space-5); }

.au-section-heading {
    margin: 0 0 var(--space-3);
    font-size: var(--text-lg);
    font-weight: var(--weight-semibold);
}

.au-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: var(--space-3);
}

.au-card {
    display: block;
    min-width: 0;
    padding: var(--space-2);
    border: var(--border-width) solid transparent;
    border-radius: var(--radius-sm);
    background: var(--surface-raised);
    color: var(--text-primary);
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.au-card:hover { border-color: var(--border-strong); }
.au-card-art {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: var(--radius-xs);
    background: var(--surface-overlay);
}
.au-card-title, .au-card-subtitle {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.au-card-subtitle { color: var(--text-secondary); font-size: var(--text-sm); }

.au-tracklist { display: flex; flex-direction: column; }

.au-track {
    display: grid;
    grid-template-columns: 32px 1fr auto auto;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    border-radius: var(--radius-sm);
}

.au-track:hover { background: var(--surface-hover, var(--surface-raised)); }
.au-track.is-current { background: var(--surface-selected, var(--accent-subtle)); }
.au-track-art { width: 32px; height: 32px; border-radius: var(--radius-xs); object-fit: cover; }
.au-track-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.au-track-sub { color: var(--text-secondary); font-size: var(--text-xs); }
.au-track-time { color: var(--text-muted); font-variant-numeric: tabular-nums; }

.au-player {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex: 0 0 auto;
    padding: var(--space-2) var(--space-4);
    border-top: var(--border-width) solid var(--border-default);
    background: var(--surface-pane);
}

.au-player-art { width: 44px; height: 44px; border-radius: var(--radius-xs); object-fit: cover; }
.au-player-info { min-width: 0; width: 180px; }
.au-player-title, .au-player-artist {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.au-player-artist { color: var(--text-secondary); font-size: var(--text-sm); }
.au-player-controls { display: flex; align-items: center; gap: var(--space-2); }
.au-player-progress { flex: 1; min-width: 80px; }
.au-player-time { color: var(--text-muted); font-size: var(--text-xs); font-variant-numeric: tabular-nums; }

.au-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2) var(--space-3);
    border: var(--border-width) solid var(--border-default);
    border-radius: var(--radius-sm);
    background: var(--surface-raised);
    color: var(--text-primary);
    font: inherit;
    cursor: pointer;
}
.au-button:hover { border-color: var(--border-strong); }
.au-button:disabled { opacity: 0.5; cursor: default; }
.au-button--primary { background: var(--accent); color: var(--accent-contrast, #fff); }
.au-button--icon { min-width: 32px; padding: var(--space-1) var(--space-2); }
.au-link { color: var(--accent); }

.au-settings {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-width: 520px;
}
.au-settings-actions {
    display: flex;
    gap: var(--space-2);
}

.au-field { display: flex; flex-direction: column; gap: var(--space-1); margin-bottom: var(--space-3); }
.au-field label { color: var(--text-secondary); font-size: var(--text-sm); }
.au-input {
    padding: var(--space-2) var(--space-3);
    border: var(--border-width) solid var(--border-default);
    border-radius: var(--radius-sm);
    background: var(--surface-base, transparent);
    color: var(--text-primary);
    font: inherit;
}
.au-error { color: var(--danger, #f87171); font-size: var(--text-sm); }
.au-muted { color: var(--text-muted); font-size: var(--text-sm); }

.au-connect {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex: 1;
    gap: var(--space-3);
    padding: var(--space-5);
}
.au-connect-card {
    width: 100%;
    max-width: 380px;
    padding: var(--space-5);
    border: var(--border-width) solid var(--border-default);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
}

/* Rich activity, drawn in member rows, the user bar and profile cards. */
.au-activity { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.au-activity-art { width: 20px; height: 20px; border-radius: var(--radius-xs); object-fit: cover; }
.au-activity-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.au-activity-card { display: flex; flex-direction: column; gap: var(--space-2); }
.au-activity-media { display: flex; gap: var(--space-2); }
.au-activity-media img { max-width: 56px; max-height: 56px; border-radius: var(--radius-sm); object-fit: cover; }
.au-activity-links { display: flex; gap: var(--space-2); }
.au-activity-links a { color: var(--accent); }

.au-search {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
}
.au-search .au-input { flex: 1; }
.au-toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
}
.au-badge {
    padding: var(--space-1) var(--space-2);
    border-radius: var(--control-radius, var(--radius-sm));
    background: var(--surface-raised);
    color: var(--text-secondary);
    font-size: var(--text-xs);
}
.au-nav-spacer { flex: 1; }
.au-nav-user {
    overflow: hidden;
    padding: var(--space-2) var(--space-3);
    text-overflow: ellipsis;
    white-space: nowrap;
}

.au-activity--row,
.au-activity--self {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
}
.au-activity-card-body { min-width: 0; }
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
.au-activity-progress-fill {
    height: 100%;
    background: var(--accent);
}
.au-activity-progress-time {
    color: var(--text-muted);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;
}
.au-activity-links a {
    padding: var(--space-1) var(--space-2);
    border: var(--border-width) solid var(--button-secondary-border, var(--border-default));
    border-radius: var(--control-radius, var(--radius-sm));
    background: var(--button-secondary-bg, var(--surface-raised));
    color: var(--button-secondary-text, var(--accent));
    font-size: var(--text-xs);
    text-decoration: none;
}
.au-activity-links a:hover {
    background: var(--button-secondary-bg-hover, var(--surface-hover, var(--surface-raised)));
}
`;
