/**
 * Sharing actions for tracks shown in the pane.
 *
 * Squigly links are deterministic, so they are built locally; Aurral share
 * links are server-issued short URLs backed by a share manifest. Both are
 * exposed as "Share with…" choices rather than one button that silently did
 * two different things.
 */
import type { AurralTrack } from "./client";
import { text } from "./model";
import { currentClient } from "./session";
import { squiglyUrl } from "./status";
import { ui } from "./store";

type Shareable = Record<string, unknown>;

const MBID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function field(track: Shareable, keys: string[]): string {
    return text(track, keys).trim().slice(0, 300);
}

function mbidOrNull(track: Shareable, keys: string[]): string | null {
    const value = field(track, keys);
    return MBID.test(value) ? value : null;
}

function numberOrNull(value: unknown): number | null {
    return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

/** Build the manifest Aurral's `/api/share-links/plain` endpoint expects. */
export function aurralShareManifest(track: Shareable): Record<string, unknown> | null {
    const title = field(track, ["title", "trackName"]);
    const artistName = field(track, ["artistName", "artist", "albumArtist"]);
    if (!title || !artistName) return null;
    const row = {
        title,
        artistName,
        albumTitle: field(track, ["albumName", "albumTitle", "album"]) || null,
        artistMbid: mbidOrNull(track, ["artistMbid"]),
        albumMbid: mbidOrNull(track, ["albumMbid"]),
        trackMbid: mbidOrNull(track, ["trackMbid", "mbid"]),
        durationMs: numberOrNull(track.durationMs),
        discNumber: numberOrNull(track.discNumber) ?? 1,
        trackNumber: numberOrNull(track.trackNumber) ?? 1,
        path: null,
        size: null,
        format: null,
    };
    return { version: 1, kind: "track", ...row, tracks: [row] };
}

/** Open the deterministic Squigly song page for a track. */
export function shareToSquigly(track: Shareable): boolean {
    const url = squiglyUrl(track as AurralTrack);
    if (!url) {
        ui.notice = "This track does not have enough metadata for a Squigly link.";
        return false;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
}

/** Ask Aurral for a public short link and copy it to the clipboard. */
export async function shareToAurral(track: Shareable): Promise<boolean> {
    const client = currentClient();
    if (!client) return false;
    const manifest = aurralShareManifest(track);
    if (!manifest) {
        ui.notice = "This track does not have enough metadata for an Aurral share link.";
        return false;
    }
    try {
        const payload = await client.createPlainShareLink(manifest);
        const url = payload.link?.url;
        if (!url) throw new Error("The server did not return a share link.");
        try {
            await navigator.clipboard.writeText(url);
            ui.notice = "Aurral share link copied.";
        } catch {
            window.prompt("Copy this Aurral share link", url);
        }
        return true;
    } catch {
        ui.notice = "Could not create an Aurral share link.";
        return false;
    }
}
