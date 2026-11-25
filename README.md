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
  activity renderer shows in member rows, the user bar and profile cards. The
  plain Matrix status line is not touched. A paused song stays visible for 15
  seconds, then the field is cleared; resuming keeps it. Uninstalling or signing
  out clears it immediately.
- **Squigly link** — built from track metadata as
  `https://squigly.link/song/<artist-slug>/<title-slug>`.

## Required settings on your Aurral server

The plugin talks to Aurral from Tumult's origin, so Aurral must allow that
origin in CORS. Set `CORS_ORIGIN` to a comma-separated list of **full origins**,
including the scheme:

```sh
CORS_ORIGIN=https://tumult.example,https://music.example,app://tumult
```

For the hosted Aurral client and Tumult desktop app, include:

```text
https://tumult.jackg.cc,https://music.aurral.org,https://music.jackg.cc,app://tumult
```

Important details:

- Use exact origins: `https://host`, never a bare hostname such as `host`.
- Include the port if Tumult is served from one, e.g. `http://localhost:5173`.
- Include `app://tumult` for the Tumult desktop app; the browser sends that as
  its origin.
- No paths and no trailing slashes.
- Restart Aurral after changing the environment variable.

Aurral compares this value literally with the browser's `Origin` header, so
bare hostnames will not match. You can verify a value with:

```sh
curl -sS -D - -o /dev/null \
  -H 'Origin: https://tumult.example' \
  https://music.example/api/health/bootstrap \
  | grep -i access-control-allow-origin
```

Expected:

```text
access-control-allow-origin: https://tumult.example
```

Aurral's stream routes are not CORS-public and send
`Cross-Origin-Resource-Policy: same-origin`. The plugin fetches audio with the
session token and plays it from a blob URL, which works once CORS is configured
as above. Tracks that appear on several albums are tried in each album context,
and Aurral's actual error (for example `Track file missing`) is shown instead of
a bare `stream_failed`.

Do **not** put an Aurral API key in plugin settings: it is an administrator
credential. This plugin signs in as the user and uses only a user session token,
which is kept across Tumult restarts.

## Install and build

```sh
pnpm install
pnpm build          # writes dist/plugin.js
pnpm typecheck      # checks against the vendored plugin types
```

Tag a release matching the manifest version to publish it:

```sh
git tag v0.0.14 && git push origin v0.0.14
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
| `src/aurral/status.ts` | activity document, Squigly URL, rich-status publishing |
| `src/aurral/store.ts` | reactive data for the pane's views |
| `src/components/` | Vue components for the pane, sidebar, player, settings and activity |
| `src/styles.ts` | injected stylesheet — CSS must not live in an SFC `<style>` block |
| `src/shims/vue.ts` | generated bridge to the host's Vue runtime |
| `types/plugin.d.ts` | generated plugin API types — do not edit here |

## Notes

- `minUI`/`minCore` are declared in both manifests because the plugin needs the
  newer activity and workspace-pane APIs.
- Squigly's own `/api/create` flow is locked to the `https://squigly.link`
  origin, so the plugin builds pretty URLs from track metadata instead. Its
  artist/title slugs are NFKD-folded, lower-case, hyphenated and truncated to
  40 characters; apostrophes count as separators (`Heaven's` → `heaven-s`).
  Links may still miss when Squigly's canonical credits differ from Aurral's.
- If the server does not advertise extended profile fields, the rich activity
  card is unavailable; the plugin does not fall back to a plain status line.
