import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  detectFormat,
  importPlaylist,
  InvalidPlaylistFileError,
  parseNativePlaylist,
  parseTitleArtist,
  parseYouTubePlaylist,
} from "./playlist-import";

const FIXTURE_PATH = resolve(__dirname, "../../tests/unit/fixtures/youtube-playlist.json");
const youtubeFixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as unknown;

const fixedDate = () => new Date("2026-05-08T12:00:00Z");
let idCounter = 0;
const idFactory = () => `id-${++idCounter}`;

describe("detectFormat", () => {
  it("detects youtube format", () => {
    expect(detectFormat({ kind: "youtube#playlistItemListResponse", items: [] })).toBe("youtube");
  });

  it("detects native format", () => {
    expect(detectFormat({ name: "X", tracks: [] })).toBe("native");
  });

  it("returns unknown for primitives and arrays", () => {
    expect(detectFormat(null)).toBe("unknown");
    expect(detectFormat(42)).toBe("unknown");
    expect(detectFormat("string")).toBe("unknown");
    expect(detectFormat([])).toBe("unknown");
  });

  it("returns unknown for unrecognized objects", () => {
    expect(detectFormat({ foo: "bar" })).toBe("unknown");
  });
});

describe("parseTitleArtist", () => {
  it("splits on first ' - ' separator", () => {
    expect(parseTitleArtist("Lizzo - Juice (Official Video)", "Lizzo Music")).toEqual({
      artist: "Lizzo",
      title: "Juice",
    });
  });

  it("strips bracketed suffixes case-insensitively", () => {
    expect(parseTitleArtist("SAULE - Dusty Men [CLIP OFFICIEL]", "SAULE")).toEqual({
      artist: "SAULE",
      title: "Dusty Men",
    });
  });

  it("strips multiple suffix groups", () => {
    expect(parseTitleArtist("Artist - Song (Official Video) [HD]", "Artist")).toEqual({
      artist: "Artist",
      title: "Song",
    });
  });

  it("splits on first separator only when title contains additional ' - '", () => {
    expect(parseTitleArtist("Daft Punk - One More Time - Aerodynamic", "Daft Punk")).toEqual({
      artist: "Daft Punk",
      title: "One More Time - Aerodynamic",
    });
  });

  it("falls back to channel title when no separator present", () => {
    expect(parseTitleArtist("Some Track Title", "Channel Name")).toEqual({
      artist: "Channel Name",
      title: "Some Track Title",
    });
  });

  it("uses 'Inconnu' when fallback is empty and no separator present", () => {
    expect(parseTitleArtist("Solo Title", "")).toEqual({
      artist: "Inconnu",
      title: "Solo Title",
    });
  });

  it("preserves non-suffix parenthesized content", () => {
    const result = parseTitleArtist("Beethoven - Symphony No. 9 (Choral)", "Various");
    expect(result.title).toBe("Symphony No. 9 (Choral)");
    expect(result.artist).toBe("Beethoven");
  });

  it("throws on an empty title", () => {
    expect(() => parseTitleArtist("", "Channel")).toThrow(InvalidPlaylistFileError);
  });

  it("throws when only suffixes are present", () => {
    expect(() => parseTitleArtist("(Official Video)", "Channel")).toThrow(InvalidPlaylistFileError);
  });
});

describe("parseNativePlaylist", () => {
  it("parses a valid native export", () => {
    idCounter = 0;
    const json = {
      id: "abc",
      name: "My Playlist",
      tracks: [
        { expectedTitle: "Juice", expectedArtist: "Lizzo", youtubeId: "XaCrQL_8eMY" },
        {
          expectedTitle: "Dusty Men",
          expectedArtist: "SAULE",
          youtubeId: "8mCLc332sTM",
          startSeconds: 12,
        },
      ],
    };
    const result = parseNativePlaylist(json, { idFactory });
    expect(result.format).toBe("native");
    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.playlist.name).toBe("My Playlist");
    expect(result.playlist.tracks[0]!.youtubeId).toBe("XaCrQL_8eMY");
    expect(result.playlist.tracks[1]!.startSeconds).toBe(12);
  });

  it("generates an id when source has none", () => {
    idCounter = 0;
    const result = parseNativePlaylist(
      {
        name: "X",
        tracks: [{ expectedTitle: "T", expectedArtist: "A", youtubeId: "XaCrQL_8eMY" }],
      },
      { idFactory },
    );
    expect(result.playlist.id).toBe("id-1");
  });

  it("rejects invalid native input", () => {
    expect(() => parseNativePlaylist({ name: "", tracks: [] })).toThrow(InvalidPlaylistFileError);
  });
});

describe("parseYouTubePlaylist", () => {
  it("imports the whole reference fixture (46 tracks, 0 skipped)", () => {
    idCounter = 0;
    const result = parseYouTubePlaylist(youtubeFixture, { idFactory, now: fixedDate });
    expect(result.format).toBe("youtube");
    expect(result.imported).toBe(46);
    expect(result.skipped).toBe(0);
    expect(result.playlist.tracks.length).toBe(46);
    expect(result.playlist.name).toBe("Import YouTube — 2026-05-08");
  });

  it("orders tracks by snippet.position", () => {
    idCounter = 0;
    const result = parseYouTubePlaylist(youtubeFixture, { idFactory, now: fixedDate });
    expect(result.playlist.tracks[0]!.youtubeId).toBe("XaCrQL_8eMY");
    expect(result.playlist.tracks[1]!.youtubeId).toBe("8mCLc332sTM");
  });

  it("derives artist/title via the heuristic", () => {
    idCounter = 0;
    const result = parseYouTubePlaylist(youtubeFixture, { idFactory, now: fixedDate });
    const first = result.playlist.tracks[0]!;
    expect(first.expectedArtist).toBe("Lizzo");
    expect(first.expectedTitle).toBe("Juice");
  });

  it("skips items marked Private video", () => {
    idCounter = 0;
    const json = {
      kind: "youtube#playlistItemListResponse",
      items: [
        {
          snippet: {
            title: "Private video",
            position: 0,
            videoOwnerChannelTitle: "X",
            resourceId: { videoId: "AAAAAAAAAAA" },
          },
        },
        {
          snippet: {
            title: "Lizzo - Juice (Official Video)",
            position: 1,
            videoOwnerChannelTitle: "Lizzo Music",
            resourceId: { videoId: "XaCrQL_8eMY" },
          },
        },
      ],
    };
    const result = parseYouTubePlaylist(json, { idFactory, now: fixedDate });
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.playlist.tracks[0]!.youtubeId).toBe("XaCrQL_8eMY");
  });

  it("skips items with missing videoId", () => {
    idCounter = 0;
    const json = {
      kind: "youtube#playlistItemListResponse",
      items: [
        {
          snippet: {
            title: "No id",
            position: 0,
            videoOwnerChannelTitle: "X",
            resourceId: {},
          },
        },
        {
          snippet: {
            title: "Lizzo - Juice",
            position: 1,
            videoOwnerChannelTitle: "Lizzo Music",
            resourceId: { videoId: "XaCrQL_8eMY" },
          },
        },
      ],
    };
    const result = parseYouTubePlaylist(json, { idFactory, now: fixedDate });
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it("orders correctly when positions are not in array order", () => {
    idCounter = 0;
    const json = {
      kind: "youtube#playlistItemListResponse",
      items: [
        {
          snippet: {
            title: "B - Second",
            position: 1,
            videoOwnerChannelTitle: "B",
            resourceId: { videoId: "8mCLc332sTM" },
          },
        },
        {
          snippet: {
            title: "A - First",
            position: 0,
            videoOwnerChannelTitle: "A",
            resourceId: { videoId: "XaCrQL_8eMY" },
          },
        },
      ],
    };
    const result = parseYouTubePlaylist(json, { idFactory, now: fixedDate });
    expect(result.playlist.tracks[0]!.expectedArtist).toBe("A");
    expect(result.playlist.tracks[1]!.expectedArtist).toBe("B");
  });

  it("skips items whose videoId does not match the YouTube id format", () => {
    idCounter = 0;
    const json = {
      kind: "youtube#playlistItemListResponse",
      items: [
        {
          snippet: {
            title: "Bad - Item",
            position: 0,
            videoOwnerChannelTitle: "Bad",
            resourceId: { videoId: "tooShort" },
          },
        },
        {
          snippet: {
            title: "Lizzo - Juice",
            position: 1,
            videoOwnerChannelTitle: "Lizzo Music",
            resourceId: { videoId: "XaCrQL_8eMY" },
          },
        },
      ],
    };
    const result = parseYouTubePlaylist(json, { idFactory, now: fixedDate });
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it("skips items whose title becomes empty after suffix stripping", () => {
    idCounter = 0;
    const json = {
      kind: "youtube#playlistItemListResponse",
      items: [
        {
          snippet: {
            title: "(Official Video)",
            position: 0,
            videoOwnerChannelTitle: "X",
            resourceId: { videoId: "AAAAAAAAAAA" },
          },
        },
        {
          snippet: {
            title: "Lizzo - Juice",
            position: 1,
            videoOwnerChannelTitle: "Lizzo Music",
            resourceId: { videoId: "XaCrQL_8eMY" },
          },
        },
      ],
    };
    const result = parseYouTubePlaylist(json, { idFactory, now: fixedDate });
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it("orders items without position after positioned ones, preserving original order", () => {
    idCounter = 0;
    const json = {
      kind: "youtube#playlistItemListResponse",
      items: [
        {
          snippet: {
            title: "No Position 1 - X",
            videoOwnerChannelTitle: "X",
            resourceId: { videoId: "AAAAAAAAAAA" },
          },
        },
        {
          snippet: {
            title: "Has Position - Y",
            position: 0,
            videoOwnerChannelTitle: "Y",
            resourceId: { videoId: "BBBBBBBBBBB" },
          },
        },
        {
          snippet: {
            title: "No Position 2 - Z",
            videoOwnerChannelTitle: "Z",
            resourceId: { videoId: "CCCCCCCCCCC" },
          },
        },
      ],
    };
    const result = parseYouTubePlaylist(json, { idFactory, now: fixedDate });
    expect(result.playlist.tracks.map((t) => t.youtubeId)).toEqual([
      "BBBBBBBBBBB",
      "AAAAAAAAAAA",
      "CCCCCCCCCCC",
    ]);
  });

  it("uses the system clock when no `now` option is provided", () => {
    idCounter = 0;
    const result = parseYouTubePlaylist(youtubeFixture, { idFactory });
    expect(result.playlist.name).toMatch(/^Import YouTube — \d{4}-\d{2}-\d{2}$/);
  });

  it("generates an id via the default factory when none is provided", () => {
    const result = parseYouTubePlaylist(youtubeFixture, { now: fixedDate });
    expect(result.playlist.id.length).toBeGreaterThan(0);
  });

  it("rejects payloads missing the expected kind", () => {
    expect(() => parseYouTubePlaylist({ kind: "youtube#searchListResponse", items: [] })).toThrow(
      InvalidPlaylistFileError,
    );
  });

  it("rejects when the playlist contains zero playable items", () => {
    expect(() =>
      parseYouTubePlaylist(
        {
          kind: "youtube#playlistItemListResponse",
          items: [
            {
              snippet: {
                title: "Private video",
                position: 0,
                videoOwnerChannelTitle: "X",
                resourceId: { videoId: "AAAAAAAAAAA" },
              },
            },
          ],
        },
        { idFactory, now: fixedDate },
      ),
    ).toThrow(InvalidPlaylistFileError);
  });
});

describe("importPlaylist (facade)", () => {
  it("dispatches to youtube parser", () => {
    idCounter = 0;
    const result = importPlaylist(youtubeFixture, { idFactory, now: fixedDate });
    expect(result.format).toBe("youtube");
    expect(result.imported).toBe(46);
  });

  it("dispatches to native parser", () => {
    idCounter = 0;
    const result = importPlaylist(
      {
        name: "Native",
        tracks: [{ expectedTitle: "T", expectedArtist: "A", youtubeId: "XaCrQL_8eMY" }],
      },
      { idFactory },
    );
    expect(result.format).toBe("native");
    expect(result.imported).toBe(1);
  });

  it("throws on unknown format", () => {
    expect(() => importPlaylist({ foo: "bar" })).toThrow(InvalidPlaylistFileError);
  });
});
