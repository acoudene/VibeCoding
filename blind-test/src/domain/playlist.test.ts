import { describe, expect, it } from "vitest";

import { EmptyPlaylistError, EmptyPlaylistNameError, Playlist } from "./playlist";
import { Track } from "./track";

const makeTrack = (id: string) =>
  Track.create({ expectedTitle: `t-${id}`, expectedArtist: "a", youtubeId: "dQw4w9WgXcQ" });

describe("Playlist", () => {
  describe("create", () => {
    it("returns a playlist with the given id, name, and tracks", () => {
      const t1 = makeTrack("1");
      const t2 = makeTrack("2");
      const playlist = Playlist.create({ id: "pl1", name: "80s hits", tracks: [t1, t2] });
      expect(playlist.id).toBe("pl1");
      expect(playlist.name).toBe("80s hits");
      expect(playlist.tracks).toEqual([t1, t2]);
    });

    it("rejects an empty name", () => {
      expect(() => Playlist.create({ id: "pl1", name: "", tracks: [makeTrack("1")] })).toThrow(
        EmptyPlaylistNameError,
      );
    });

    it("rejects a whitespace-only name", () => {
      expect(() => Playlist.create({ id: "pl1", name: "   ", tracks: [makeTrack("1")] })).toThrow(
        EmptyPlaylistNameError,
      );
    });

    it("rejects an empty tracks array", () => {
      expect(() => Playlist.create({ id: "pl1", name: "x", tracks: [] })).toThrow(
        EmptyPlaylistError,
      );
    });

    it("preserves the order of tracks", () => {
      const ts = ["1", "2", "3", "4", "5"].map(makeTrack);
      const playlist = Playlist.create({ id: "pl1", name: "x", tracks: ts });
      expect(playlist.tracks).toEqual(ts);
      expect(playlist.tracks[0]?.expectedTitle).toBe("t-1");
      expect(playlist.tracks[4]?.expectedTitle).toBe("t-5");
    });

    it("does not share the internal tracks array with the caller", () => {
      const ts = [makeTrack("1"), makeTrack("2")];
      const playlist = Playlist.create({ id: "pl1", name: "x", tracks: ts });
      ts.push(makeTrack("3"));
      expect(playlist.tracks).toHaveLength(2);
    });
  });

  describe("trackAt", () => {
    it("returns the track at the given index", () => {
      const t1 = makeTrack("1");
      const t2 = makeTrack("2");
      const playlist = Playlist.create({ id: "pl1", name: "x", tracks: [t1, t2] });
      expect(playlist.trackAt(0)).toBe(t1);
      expect(playlist.trackAt(1)).toBe(t2);
    });

    it("returns undefined for an out-of-range index", () => {
      const playlist = Playlist.create({ id: "pl1", name: "x", tracks: [makeTrack("1")] });
      expect(playlist.trackAt(5)).toBeUndefined();
      expect(playlist.trackAt(-1)).toBeUndefined();
    });
  });

  describe("length", () => {
    it("returns the number of tracks", () => {
      const playlist = Playlist.create({
        id: "pl1",
        name: "x",
        tracks: [makeTrack("1"), makeTrack("2"), makeTrack("3")],
      });
      expect(playlist.length).toBe(3);
    });
  });
});
