import { z } from "zod";

import { Playlist, type PlaylistId } from "./playlist";
import { Track } from "./track";

export class InvalidPlaylistFileError extends Error {
  constructor(reason: string) {
    super(`Invalid playlist file: ${reason}`);
    this.name = "InvalidPlaylistFileError";
  }
}

export type PlaylistImportFormat = "native" | "youtube" | "unknown";

export type ImportResult = {
  playlist: Playlist;
  imported: number;
  skipped: number;
  format: "native" | "youtube";
};

export type ImportOptions = {
  idFactory?: () => PlaylistId;
  now?: () => Date;
};

const NativeTrackSchema = z.object({
  expectedTitle: z.string().min(1),
  expectedArtist: z.string().min(1),
  youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  startSeconds: z.number().nonnegative().optional(),
});

const NativePlaylistSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  tracks: z.array(NativeTrackSchema).min(1),
});

const YoutubeItemSchema = z.object({
  snippet: z
    .object({
      title: z.string().optional(),
      position: z.number().int().optional(),
      videoOwnerChannelTitle: z.string().optional(),
      resourceId: z
        .object({
          videoId: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

const YoutubeResponseSchema = z.object({
  kind: z.literal("youtube#playlistItemListResponse"),
  items: z.array(YoutubeItemSchema),
});

export function detectFormat(json: unknown): PlaylistImportFormat {
  if (json === null || typeof json !== "object") return "unknown";
  const obj = json as Record<string, unknown>;
  if (obj.kind === "youtube#playlistItemListResponse") return "youtube";
  if (typeof obj.name === "string" && Array.isArray(obj.tracks)) return "native";
  return "unknown";
}

const SUFFIX_PATTERNS = [
  /\bofficial\s+music\s+video\b/i,
  /\bofficial\s+video\b/i,
  /\bofficial\s+audio\b/i,
  /\bclip\s+officiel\b/i,
  /\bvideo\s+officiel(?:le)?\b/i,
  /\blyric\s+video\b/i,
  /\blyrics?\b/i,
  /\bvisualizer\b/i,
  /\baudio\b/i,
  /\bhd\b/i,
  /\b4k\b/i,
];

function stripParentheticalSuffixes(input: string): string {
  let out = input;
  // Remove (...) or [...] groups whose inner text matches a known suffix pattern.
  // Loop because multiple suffix groups can appear back-to-back.
  let changed = true;
  while (changed) {
    changed = false;
    out = out.replace(/\s*[(\[]([^()\[\]]*)[)\]]/g, (match, inner: string) => {
      if (SUFFIX_PATTERNS.some((re) => re.test(inner))) {
        changed = true;
        return "";
      }
      return match;
    });
  }
  return out.replace(/\s+/g, " ").trim();
}

export function parseTitleArtist(
  rawTitle: string,
  fallbackArtist: string,
): { title: string; artist: string } {
  const cleaned = stripParentheticalSuffixes(rawTitle);
  if (cleaned.length === 0) {
    throw new InvalidPlaylistFileError("Empty track title");
  }
  const sepIndex = cleaned.indexOf(" - ");
  if (sepIndex === -1) {
    const fallback = fallbackArtist.trim();
    return {
      title: cleaned,
      artist: fallback.length > 0 ? fallback : "Inconnu",
    };
  }
  const artist = cleaned.slice(0, sepIndex).trim();
  const title = cleaned.slice(sepIndex + 3).trim();
  if (artist.length === 0 || title.length === 0) {
    const fallback = fallbackArtist.trim();
    return {
      title: cleaned,
      artist: fallback.length > 0 ? fallback : "Inconnu",
    };
  }
  return { artist, title };
}

const UNAVAILABLE_TITLES = new Set([
  "private video",
  "[private video]",
  "deleted video",
  "[deleted video]",
]);

function isUnplayableTitle(title: string | undefined): boolean {
  if (!title) return false;
  return UNAVAILABLE_TITLES.has(title.trim().toLowerCase());
}

function defaultIdFactory(): PlaylistId {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return Math.random().toString(36).slice(2, 12);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseNativePlaylist(json: unknown, opts: ImportOptions = {}): ImportResult {
  const result = NativePlaylistSchema.safeParse(json);
  if (!result.success) {
    throw new InvalidPlaylistFileError(result.error.message);
  }
  const data = result.data;
  const tracks = data.tracks.map((t) =>
    Track.create({
      expectedTitle: t.expectedTitle,
      expectedArtist: t.expectedArtist,
      youtubeId: t.youtubeId,
      startSeconds: t.startSeconds,
    }),
  );
  const idFactory = opts.idFactory ?? defaultIdFactory;
  const id = data.id && data.id.length > 0 ? data.id : idFactory();
  const playlist = Playlist.create({ id, name: data.name, tracks });
  return { playlist, imported: tracks.length, skipped: 0, format: "native" };
}

export function parseYouTubePlaylist(json: unknown, opts: ImportOptions = {}): ImportResult {
  const result = YoutubeResponseSchema.safeParse(json);
  if (!result.success) {
    throw new InvalidPlaylistFileError(result.error.message);
  }
  const items = result.data.items;
  const totalIn = items.length;

  type Indexed = { item: (typeof items)[number]; originalIndex: number };
  const indexed: Indexed[] = items.map((item, originalIndex) => ({ item, originalIndex }));

  const tracks: Track[] = [];
  let skipped = 0;

  // Sort by snippet.position ascending; items without a position keep their original order
  // but are placed after positioned ones with the same value (stable by originalIndex).
  indexed.sort((a, b) => {
    const pa = a.item.snippet?.position;
    const pb = b.item.snippet?.position;
    const hasA = typeof pa === "number";
    const hasB = typeof pb === "number";
    if (hasA && hasB) return pa! - pb! || a.originalIndex - b.originalIndex;
    if (hasA) return -1;
    if (hasB) return 1;
    return a.originalIndex - b.originalIndex;
  });

  for (const { item } of indexed) {
    const snippet = item.snippet;
    const videoId = snippet?.resourceId?.videoId?.trim() ?? "";
    const rawTitle = snippet?.title ?? "";
    if (videoId.length === 0 || isUnplayableTitle(rawTitle)) {
      skipped += 1;
      continue;
    }
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      skipped += 1;
      continue;
    }
    let parsed: { title: string; artist: string };
    try {
      parsed = parseTitleArtist(rawTitle, snippet?.videoOwnerChannelTitle ?? "");
    } catch {
      skipped += 1;
      continue;
    }
    try {
      tracks.push(
        Track.create({
          expectedTitle: parsed.title,
          expectedArtist: parsed.artist,
          youtubeId: videoId,
        }),
      );
    } catch {
      skipped += 1;
    }
  }

  if (tracks.length === 0) {
    throw new InvalidPlaylistFileError("No playable items found in YouTube playlist");
  }

  const idFactory = opts.idFactory ?? defaultIdFactory;
  const now = (opts.now ?? (() => new Date()))();
  const playlist = Playlist.create({
    id: idFactory(),
    name: `Import YouTube — ${formatDate(now)}`,
    tracks,
  });

  // Sanity check on the running counts.
  if (tracks.length + skipped !== totalIn) {
    skipped = totalIn - tracks.length;
  }

  return { playlist, imported: tracks.length, skipped, format: "youtube" };
}

export function importPlaylist(json: unknown, opts: ImportOptions = {}): ImportResult {
  const format = detectFormat(json);
  if (format === "native") return parseNativePlaylist(json, opts);
  if (format === "youtube") return parseYouTubePlaylist(json, opts);
  throw new InvalidPlaylistFileError("Unrecognized format");
}
