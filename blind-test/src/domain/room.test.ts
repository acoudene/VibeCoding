import { describe, expect, it } from "vitest";

import { Playlist } from "./playlist";
import { DuplicateNicknameError, HostCannotJoinError, Room, RoomFullError } from "./room";
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

describe("Room.join", () => {
  const makeRoom = () =>
    Room.create({
      code: "ABCDEF",
      hostId: "host-1",
      playlist: makePlaylist(),
      clock: fixedClock(),
    });

  it("adds a connected player with score 0", () => {
    const room = makeRoom().join({ playerId: "p1", nickname: "Alice" });
    expect(room.players).toHaveLength(1);
    expect(room.players[0]?.id).toBe("p1");
    expect(room.players[0]?.nickname).toBe("Alice");
    expect(room.players[0]?.score).toBe(0);
    expect(room.players[0]?.connected).toBe(true);
  });

  it("returns a new room without mutating the original", () => {
    const room = makeRoom();
    const joined = room.join({ playerId: "p1", nickname: "Alice" });
    expect(room.players).toHaveLength(0);
    expect(joined.players).toHaveLength(1);
    expect(joined).not.toBe(room);
  });

  it("preserves insertion order when multiple players join", () => {
    const room = makeRoom()
      .join({ playerId: "p1", nickname: "Alice" })
      .join({ playerId: "p2", nickname: "Bob" })
      .join({ playerId: "p3", nickname: "Carol" });
    expect(room.players.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
  });

  it("rejects a duplicate nickname (case-insensitive)", () => {
    const room = makeRoom().join({ playerId: "p1", nickname: "Alice" });
    expect(() => room.join({ playerId: "p2", nickname: "alice" })).toThrow(DuplicateNicknameError);
    expect(() => room.join({ playerId: "p2", nickname: "ALICE" })).toThrow(DuplicateNicknameError);
  });

  it("allows a 9th player only if there are exactly 8 — refuses beyond", () => {
    let room = makeRoom();
    for (let i = 1; i <= 8; i++) {
      room = room.join({ playerId: `p${i}`, nickname: `Player${i}` });
    }
    expect(room.players).toHaveLength(8);
    expect(() => room.join({ playerId: "p9", nickname: "Player9" })).toThrow(RoomFullError);
  });

  it("rejects when playerId equals hostId", () => {
    const room = makeRoom();
    expect(() => room.join({ playerId: "host-1", nickname: "Host" })).toThrow(HostCannotJoinError);
  });
});
