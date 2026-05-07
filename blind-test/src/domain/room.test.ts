import { describe, expect, it } from "vitest";

import { Playlist } from "./playlist";
import { Room } from "./room";
import { Track } from "./track";

const VALID_ID = "dQw4w9WgXcQ";

const makeTrack = (id: string) =>
  Track.create({ expectedTitle: `t-${id}`, expectedArtist: "a", youtubeId: VALID_ID });

const makePlaylist = (id = "pl1") =>
  Playlist.create({ id, name: "test playlist", tracks: [makeTrack("1"), makeTrack("2")] });

const fixedClock = (t = 1_700_000_000_000) => ({ now: () => t });

describe("Room.create", () => {
  it("returns a room with the given code, hostId, playlist", () => {
    const playlist = makePlaylist();
    const room = Room.create({
      code: "ABCDEF",
      hostId: "host-1",
      playlist,
      clock: fixedClock(),
    });
    expect(room.code).toBe("ABCDEF");
    expect(room.hostId).toBe("host-1");
    expect(room.playlist).toBe(playlist);
  });

  it("starts in lobby status", () => {
    const room = Room.create({
      code: "ABCDEF",
      hostId: "host-1",
      playlist: makePlaylist(),
      clock: fixedClock(),
    });
    expect(room.status).toBe("lobby");
  });

  it("starts with no players and no rounds", () => {
    const room = Room.create({
      code: "ABCDEF",
      hostId: "host-1",
      playlist: makePlaylist(),
      clock: fixedClock(),
    });
    expect(room.players).toEqual([]);
    expect(room.rounds).toEqual([]);
  });

  it("records the creation time from the clock", () => {
    const t = 1_234_567_890;
    const room = Room.create({
      code: "ABCDEF",
      hostId: "host-1",
      playlist: makePlaylist(),
      clock: fixedClock(t),
    });
    expect(room.createdAt).toBe(t);
  });

  it("normalizes the code to uppercase", () => {
    const room = Room.create({
      code: "abcdef",
      hostId: "host-1",
      playlist: makePlaylist(),
      clock: fixedClock(),
    });
    expect(room.code).toBe("ABCDEF");
  });

  it("throws if the code is invalid", () => {
    expect(() =>
      Room.create({
        code: "BAD",
        hostId: "host-1",
        playlist: makePlaylist(),
        clock: fixedClock(),
      }),
    ).toThrow();
  });
});
