# Aurral for Tumult

A Tumult workspace pane that is a real client for [Aurral](https://aurral.org)'s
version-2 app API, plus a rich "now listening" status with artwork, artist
image, track details, progress and a Squigly link.

The hosted web UI at `music.aurral.org` cannot be embedded: it sends
`frame-ancestors 'none'`, and a cross-origin frame cannot tell the plugin what
is playing. This plugin signs in to **your** Aurral server instead, owns
playback, and therefore always knows the current song.

## What it does

- **Workspace pane** — Home/Discover, Search, Library (albums, artists, tracks,
  genres), Playlists, Requests, People and Share links, with a player bar.
- **Authentication** — the same username/password flow as the official web
  client. Only the resulting session token is kept in the browser; the password
  is discarded. Sign out from Settings → Plugins → Aurral.
- **Playback** — restores/saves the Aurral play queue, streams through short-lived
  tokens, publishes `now-playing` events, and syncs the queue across devices.
- **Rich status** — writes a plugin-owned extended profile field that Tumult's
  activity renderer shows in member rows, the user bar and profile cards. It
  also sets the plain Matrix status line for other clients. Both are cleared
  when playback stops or the plugin is uninstalled.
- **Squigly link** — built from track metadata as
  `https://squigly.link/song/<artist-slug>/<title-slug>`.

## Server requirements

The plugin runs in Tumult's origin, so your Aurral server must allow it:

```sh
CORS_ORIGIN=https://tumult.example
```

Set it to the exact origin of the Tumult web/desktop app (no trailing slash,
no path). Without it, browsers block the API and audio calls.

Aurral's stream routes are not CORS-public and send
`Cross-Origin-Resource-Policy: same-origin`. The plugin fetches audio with the
session token and plays it from a blob URL, which works with CORS alone. If you
prefer direct stream URLs, your proxy must emit `Cross-Origin-Resource-Policy:
cross-origin` for those routes.

Do **not** put an Aurral API key in plugin settings: it is an administrator
credential. This plugin signs in as the user and uses only a user session token.

## Install and build

```sh
pnpm install
pnpm build          # writes dist/plugin.js
pnpm typecheck      # checks against the vendored plugin types
```

Tag a release matching the manifest version to publish it:

```sh
git tag v0.0.1 && git push origin v0.0.1
```

The workflow builds, hashes and attaches `plugin.js` and `tumult.plugin.json`.
Then in Tumult: **Settings → Plugins → paste this repository URL**.

The plugin declares `workspace-panes`, `settings-tabs`, `activity-renderers` and
`styles`, which places it in the **trusted** lane and requires Tumult UI API
`1.4.1` / core contract `1.7.0` or newer.

## Layout

| path | what it is |
|---|---|
| `tumult.plugin.json` | release manifest; keep in step with `src/index.ts` |
| `src/index.ts` | plugin registration: pane, settings tab, activity renderer, stylesheet |
| `src/aurral/client.ts` | typed Aurral v2 API client and session login |
| `src/aurral/session.ts` | persisted session token (never the password) |
| `src/aurral/player.ts` | audio element, queue state, transport, now-playing publishing |
| `src/aurral/status.ts` | activity document, Squigly URL, Matrix status line |
| `src/aurral/store.ts` | reactive data for the pane's views |
| `src/components/` | Vue components for the pane, sidebar, player, settings and activity |
| `src/styles.ts` | injected stylesheet — CSS must not live in an SFC `<style>` block |
| `src/shims/vue.ts` | generated bridge to the host's Vue runtime |
| `types/plugin.d.ts` | generated plugin API types — do not edit here |

## Notes

- `minUI`/`minCore` are declared in both manifests because the plugin needs the
  newer activity and workspace-pane APIs.
- Squigly has no public lookup API; the slug link is constructed from metadata.
  It may not resolve for unusual titles or non-Latin scripts.
- If the server does not advertise extended profile fields, the rich activity
  card is unavailable but the plain status line still works.
