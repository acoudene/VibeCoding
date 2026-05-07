import { describe, expect, it } from "vitest";

import { Playlist } from "./playlist";
import {
  BuzzAlreadyTakenError,
  CannotStartEmptyRoomError,
  DuplicateNicknameError,
  GameNotInProgressError,
  HostCannotJoinError,
  InvalidValidationError,
  NicknameMismatchError,
  NoMoreTracksError,
  PlayerBlockedError,
  PlayerNotInRoomError,
  Room,
  RoomFullError,
  RoomNotJoinableError,
  RoomNotStartableError,
  RoundNotResolvedError,
} from "./room";
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

describe("Room.leave", () => {
  const makeRoomWith = (...ids: string[]) => {
    let room = Room.create({
      code: "ABCDEF",
      hostId: "host-1",
      playlist: makePlaylist(),
      clock: fixedClock(),
    });
    for (const id of ids) {
      room = room.join({ playerId: id, nickname: id });
    }
    return room;
  };

  it("flags the player as connected: false", () => {
    const room = makeRoomWith("p1", "p2").leave("p1");
    expect(room.players[0]?.connected).toBe(false);
    expect(room.players[1]?.connected).toBe(true);
  });

  it("preserves the player's score on leave (R7)", () => {
    // At this stage scores are always 0 (no validate yet). We assert leave
    // doesn't modify the score field — full preservation across points is
    // covered by T10.1 once Room.validate awards points.
    const before = makeRoomWith("p1").players[0]!.score;
    const after = makeRoomWith("p1").leave("p1").players[0]!.score;
    expect(after).toBe(before);
  });

  it("does not remove the player from the players array", () => {
    const room = makeRoomWith("p1", "p2", "p3").leave("p2");
    expect(room.players).toHaveLength(3);
    expect(room.players.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
  });

  it("returns a new room without mutating the original", () => {
    const room = makeRoomWith("p1");
    const left = room.leave("p1");
    expect(room.players[0]?.connected).toBe(true);
    expect(left.players[0]?.connected).toBe(false);
    expect(left).not.toBe(room);
  });

  it("is idempotent: leaving twice keeps the player disconnected", () => {
    const left = makeRoomWith("p1").leave("p1").leave("p1");
    expect(left.players[0]?.connected).toBe(false);
  });

  it("throws PlayerNotInRoomError when the player is not in the room", () => {
    const room = makeRoomWith("p1");
    expect(() => room.leave("ghost")).toThrow(PlayerNotInRoomError);
  });
});

describe("Room.reconnect", () => {
  const baseRoom = () =>
    Room.create({
      code: "ABCDEF",
      hostId: "host-1",
      playlist: makePlaylist(),
      clock: fixedClock(),
    });

  it("flips connected back to true when nickname matches", () => {
    const room = baseRoom()
      .join({ playerId: "p1", nickname: "Alice" })
      .leave("p1")
      .reconnect({ playerId: "p1", nickname: "Alice" });
    expect(room.players[0]?.connected).toBe(true);
  });

  it("matches nickname case-insensitively", () => {
    const room = baseRoom()
      .join({ playerId: "p1", nickname: "Alice" })
      .leave("p1")
      .reconnect({ playerId: "p1", nickname: "ALICE" });
    expect(room.players[0]?.connected).toBe(true);
  });

  it("preserves the player's score on reconnect", () => {
    const before = baseRoom().join({ playerId: "p1", nickname: "Alice" });
    const after = before.leave("p1").reconnect({ playerId: "p1", nickname: "Alice" });
    expect(after.players[0]?.score).toBe(before.players[0]?.score);
  });

  it("rejects when the nickname does not match", () => {
    const room = baseRoom().join({ playerId: "p1", nickname: "Alice" }).leave("p1");
    expect(() => room.reconnect({ playerId: "p1", nickname: "Bob" })).toThrow(
      NicknameMismatchError,
    );
  });

  it("rejects when the player is not in the room", () => {
    const room = baseRoom();
    expect(() => room.reconnect({ playerId: "ghost", nickname: "x" })).toThrow(
      PlayerNotInRoomError,
    );
  });

  it("is a no-op for an already-connected player with the right nickname", () => {
    const room = baseRoom().join({ playerId: "p1", nickname: "Alice" });
    const after = room.reconnect({ playerId: "p1", nickname: "Alice" });
    expect(after.players[0]?.connected).toBe(true);
    expect(after.players[0]?.id).toBe("p1");
  });

  it("returns a new room without mutating the original", () => {
    const left = baseRoom().join({ playerId: "p1", nickname: "Alice" }).leave("p1");
    const reconnected = left.reconnect({ playerId: "p1", nickname: "Alice" });
    expect(left.players[0]?.connected).toBe(false);
    expect(reconnected.players[0]?.connected).toBe(true);
    expect(reconnected).not.toBe(left);
  });
});

describe("Room.playNextTrack", () => {
  const baseRoom = () =>
    Room.create({
      code: "ABCDEF",
      hostId: "host-1",
      playlist: makePlaylist(),
      clock: fixedClock(),
    });

  it("rejects if the current round is still playing (not resolved)", () => {
    const started = baseRoom().join({ playerId: "p1", nickname: "Alice" }).start();
    expect(() => started.playNextTrack()).toThrow(RoundNotResolvedError);
  });

  it("rejects if the room status is lobby", () => {
    const lobby = baseRoom().join({ playerId: "p1", nickname: "Alice" });
    expect(() => lobby.playNextTrack()).toThrow(GameNotInProgressError);
  });

  // Happy-path advancement (round resolved -> next round) is covered in T10.1
  // tests once Room.validate exists. This avoids a test-only backdoor in the
  // domain API.
});

describe("Room.start", () => {
  const baseRoom = () =>
    Room.create({
      code: "ABCDEF",
      hostId: "host-1",
      playlist: makePlaylist(),
      clock: fixedClock(),
    });

  it("transitions status from lobby to playing", () => {
    const started = baseRoom().join({ playerId: "p1", nickname: "Alice" }).start();
    expect(started.status).toBe("playing");
  });

  it("creates round 0 with status playing and no buzzer", () => {
    const started = baseRoom().join({ playerId: "p1", nickname: "Alice" }).start();
    expect(started.rounds).toHaveLength(1);
    const round = started.rounds[0]!;
    expect(round.trackIndex).toBe(0);
    expect(round.status).toBe("playing");
    expect(round.currentBuzzer).toBeUndefined();
    expect(round.blockedPlayerIds.size).toBe(0);
    expect(round.outcome).toBeUndefined();
  });

  it("rejects if no players have joined", () => {
    expect(() => baseRoom().start()).toThrow(CannotStartEmptyRoomError);
  });

  it("rejects if status is not lobby", () => {
    const started = baseRoom().join({ playerId: "p1", nickname: "Alice" }).start();
    expect(() => started.start()).toThrow(RoomNotStartableError);
  });

  it("rejects join after start (covers Room.join's status check)", () => {
    const started = baseRoom().join({ playerId: "p1", nickname: "Alice" }).start();
    expect(() => started.join({ playerId: "p2", nickname: "Bob" })).toThrow(RoomNotJoinableError);
  });

  it("returns a new room without mutating the original", () => {
    const lobby = baseRoom().join({ playerId: "p1", nickname: "Alice" });
    const started = lobby.start();
    expect(lobby.status).toBe("lobby");
    expect(lobby.rounds).toHaveLength(0);
    expect(started).not.toBe(lobby);
  });
});

describe("Room.buzz", () => {
  const startedRoom = (...players: string[]) => {
    let room = Room.create({
      code: "ABCDEF",
      hostId: "host-1",
      playlist: makePlaylist(),
      clock: fixedClock(),
    });
    for (const id of players) room = room.join({ playerId: id, nickname: id });
    return room.start();
  };

  it("transitions the current round to buzzed and stores the buzzer", () => {
    const room = startedRoom("p1").buzz({ playerId: "p1", at: 1000 });
    const round = room.rounds.at(-1)!;
    expect(round.status).toBe("buzzed");
    expect(round.currentBuzzer).toBe("p1");
  });

  it("rejects if the room is not playing (R1 — covers lobby and finished states)", () => {
    const lobby = Room.create({
      code: "ABCDEF",
      hostId: "host-1",
      playlist: makePlaylist(),
      clock: fixedClock(),
    }).join({ playerId: "p1", nickname: "p1" });
    expect(() => lobby.buzz({ playerId: "p1", at: 1000 })).toThrow(GameNotInProgressError);
  });

  it("rejects R1: round status is not playing (e.g. resolved)", () => {
    // We can land in a non-playing round if the round was somehow not playing
    // Once we have validate, we'll have natural cases. For now we exercise R2
    // (already buzzed) which is also a non-playing round.
    const room = startedRoom("p1", "p2").buzz({ playerId: "p1", at: 1000 });
    expect(() => room.buzz({ playerId: "p2", at: 2000 })).toThrow(BuzzAlreadyTakenError);
  });

  it("rejects R2: a second buzz on an already-buzzed round throws BuzzAlreadyTakenError", () => {
    const room = startedRoom("p1", "p2").buzz({ playerId: "p1", at: 1000 });
    expect(() => room.buzz({ playerId: "p2", at: 1500 })).toThrow(BuzzAlreadyTakenError);
  });

  it("R3: first call wins regardless of the at value passed afterwards", () => {
    const room = startedRoom("p1", "p2").buzz({ playerId: "p1", at: 5000 });
    expect(room.rounds.at(-1)?.currentBuzzer).toBe("p1");
    // Second call (even with smaller at) is rejected — server-side ordering.
    expect(() => room.buzz({ playerId: "p2", at: 1000 })).toThrow(BuzzAlreadyTakenError);
  });

  it("rejects a buzz from a player not in the room", () => {
    const room = startedRoom("p1");
    expect(() => room.buzz({ playerId: "ghost", at: 1000 })).toThrow(PlayerNotInRoomError);
  });

  it("records the buzz timestamp on the round (for audit)", () => {
    const room = startedRoom("p1").buzz({ playerId: "p1", at: 4242 });
    expect(room.rounds.at(-1)?.buzzedAt).toBe(4242);
  });

  it("returns a new room without mutating the original", () => {
    const before = startedRoom("p1");
    const after = before.buzz({ playerId: "p1", at: 1000 });
    expect(before.rounds.at(-1)?.status).toBe("playing");
    expect(after.rounds.at(-1)?.status).toBe("buzzed");
    expect(after).not.toBe(before);
  });

  // R4 (PlayerBlockedError) and RoundNotPlayingError-on-resolved-round are
  // exercised in T10.1 once validate('wrong') and validate('skip') exist.
});

describe("Room.validate", () => {
  const startedRoom = (...players: string[]) => {
    let room = Room.create({
      code: "ABCDEF",
      hostId: "host-1",
      playlist: makePlaylist(),
      clock: fixedClock(),
    });
    for (const id of players) room = room.join({ playerId: id, nickname: id });
    return room.start();
  };

  describe("correct", () => {
    it("awards +1 point to the buzzer and resolves the round", () => {
      const room = startedRoom("p1", "p2").buzz({ playerId: "p1", at: 1000 }).validate("correct");
      const round = room.rounds.at(-1)!;
      expect(round.status).toBe("resolved");
      expect(round.outcome).toBe("correct");
      expect(room.players.find((p) => p.id === "p1")?.score).toBe(1);
      expect(room.players.find((p) => p.id === "p2")?.score).toBe(0);
    });

    it("rejects when the round is not buzzed", () => {
      const room = startedRoom("p1");
      expect(() => room.validate("correct")).toThrow(InvalidValidationError);
    });
  });

  describe("half", () => {
    it("awards +0.5 to the buzzer and resolves the round", () => {
      const room = startedRoom("p1").buzz({ playerId: "p1", at: 1000 }).validate("half");
      const round = room.rounds.at(-1)!;
      expect(round.status).toBe("resolved");
      expect(round.outcome).toBe("half");
      expect(room.players.find((p) => p.id === "p1")?.score).toBe(0.5);
    });

    it("rejects when the round is not buzzed", () => {
      const room = startedRoom("p1");
      expect(() => room.validate("half")).toThrow(InvalidValidationError);
    });
  });

  describe("wrong", () => {
    it("blocks the buzzer and returns the round to playing with no buzzer", () => {
      const room = startedRoom("p1", "p2").buzz({ playerId: "p1", at: 1000 }).validate("wrong");
      const round = room.rounds.at(-1)!;
      expect(round.status).toBe("playing");
      expect(round.currentBuzzer).toBeUndefined();
      expect(round.blockedPlayerIds.has("p1")).toBe(true);
      expect(room.players.find((p) => p.id === "p1")?.score).toBe(0);
    });

    it("R4: a blocked player can no longer buzz on the same round", () => {
      const room = startedRoom("p1", "p2").buzz({ playerId: "p1", at: 1000 }).validate("wrong");
      expect(() => room.buzz({ playerId: "p1", at: 2000 })).toThrow(PlayerBlockedError);
    });

    it("an unblocked player can re-buzz after a wrong answer", () => {
      const room = startedRoom("p1", "p2")
        .buzz({ playerId: "p1", at: 1000 })
        .validate("wrong")
        .buzz({ playerId: "p2", at: 2000 });
      const round = room.rounds.at(-1)!;
      expect(round.status).toBe("buzzed");
      expect(round.currentBuzzer).toBe("p2");
    });

    it("when all players are blocked, the round resolves without a winner", () => {
      let room = startedRoom("p1", "p2");
      room = room.buzz({ playerId: "p1", at: 1000 }).validate("wrong");
      room = room.buzz({ playerId: "p2", at: 2000 }).validate("wrong");
      const round = room.rounds.at(-1)!;
      expect(round.status).toBe("resolved");
      expect(round.outcome).toBe("wrong");
      expect(round.blockedPlayerIds.has("p1")).toBe(true);
      expect(round.blockedPlayerIds.has("p2")).toBe(true);
      expect(room.players.find((p) => p.id === "p1")?.score).toBe(0);
      expect(room.players.find((p) => p.id === "p2")?.score).toBe(0);
    });

    it("rejects when the round is not buzzed", () => {
      const room = startedRoom("p1");
      expect(() => room.validate("wrong")).toThrow(InvalidValidationError);
    });
  });

  describe("skip", () => {
    it("resolves the round with no scoring from playing", () => {
      const room = startedRoom("p1", "p2").validate("skip");
      const round = room.rounds.at(-1)!;
      expect(round.status).toBe("resolved");
      expect(round.outcome).toBe("skip");
      expect(room.players.every((p) => p.score === 0)).toBe(true);
    });

    it("resolves the round with no scoring from buzzed (host overrides)", () => {
      const room = startedRoom("p1").buzz({ playerId: "p1", at: 1000 }).validate("skip");
      const round = room.rounds.at(-1)!;
      expect(round.status).toBe("resolved");
      expect(round.outcome).toBe("skip");
      expect(room.players[0]?.score).toBe(0);
    });
  });

  describe("playNextTrack happy path (T8.2 deferred)", () => {
    it("advances to the next round after a resolved round", () => {
      const room = startedRoom("p1")
        .buzz({ playerId: "p1", at: 1000 })
        .validate("correct")
        .playNextTrack();
      expect(room.rounds).toHaveLength(2);
      expect(room.rounds.at(-1)?.trackIndex).toBe(1);
      expect(room.rounds.at(-1)?.status).toBe("playing");
    });

    it("preserves scores across rounds", () => {
      const room = startedRoom("p1")
        .buzz({ playerId: "p1", at: 1000 })
        .validate("correct")
        .playNextTrack();
      expect(room.players[0]?.score).toBe(1);
    });
  });
});

describe("End of game (T10.2)", () => {
  const startedRoom = (...players: string[]) => {
    let room = Room.create({
      code: "ABCDEF",
      hostId: "host-1",
      playlist: makePlaylist(),
      clock: fixedClock(),
    });
    for (const id of players) room = room.join({ playerId: id, nickname: id });
    return room.start();
  };

  // The fixture playlist has 2 tracks (see makePlaylist).
  const playThroughLast = (...players: string[]) =>
    startedRoom(...players)
      .buzz({ playerId: players[0]!, at: 1000 })
      .validate("correct") // round 0 done
      .playNextTrack() // round 1 starts
      .buzz({ playerId: players[0]!, at: 2000 })
      .validate("correct"); // round 1 done

  it("playNextTrack after the last resolved round flips status to finished", () => {
    const room = playThroughLast("p1").playNextTrack();
    expect(room.status).toBe("finished");
    expect(room.rounds).toHaveLength(2); // no extra round appended
  });

  it("calling playNextTrack on a finished room throws NoMoreTracksError", () => {
    const finished = playThroughLast("p1").playNextTrack();
    expect(() => finished.playNextTrack()).toThrow(NoMoreTracksError);
  });

  it("validate is rejected once the room is finished", () => {
    const finished = playThroughLast("p1").playNextTrack();
    expect(() => finished.validate("correct")).toThrow(GameNotInProgressError);
  });

  it("buzz is rejected once the room is finished", () => {
    const finished = playThroughLast("p1").playNextTrack();
    expect(() => finished.buzz({ playerId: "p1", at: 3000 })).toThrow(GameNotInProgressError);
  });
});

describe("Room.leaderboard", () => {
  const startedRoom = (...players: string[]) => {
    let room = Room.create({
      code: "ABCDEF",
      hostId: "host-1",
      playlist: makePlaylist(),
      clock: fixedClock(),
    });
    for (const id of players) room = room.join({ playerId: id, nickname: id });
    return room.start();
  };

  it("returns players sorted by score descending", () => {
    const room = startedRoom("p1", "p2", "p3")
      .buzz({ playerId: "p2", at: 1000 })
      .validate("correct")
      .playNextTrack()
      .buzz({ playerId: "p2", at: 2000 })
      .validate("half"); // p2 = 1.5
    const board = room.leaderboard();
    expect(board.map((e) => e.playerId)).toEqual(["p2", "p1", "p3"]);
    expect(board[0]?.score).toBe(1.5);
    expect(board[0]?.nickname).toBe("p2");
  });

  it("breaks ties by nickname ascending (stable, deterministic)", () => {
    const room = startedRoom("Charlie", "Alice", "Bob");
    const board = room.leaderboard();
    expect(board.map((e) => e.playerId)).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("includes every player even disconnected ones", () => {
    const room = startedRoom("p1", "p2").leave("p1");
    const board = room.leaderboard();
    expect(board).toHaveLength(2);
    expect(board.find((e) => e.playerId === "p1")).toBeDefined();
  });

  it("does not include the host", () => {
    const room = startedRoom("p1");
    const board = room.leaderboard();
    expect(board.some((e) => e.playerId === "host-1")).toBe(false);
  });

  it("is a pure projection — does not mutate the room", () => {
    const room = startedRoom("p1");
    const before = room.players;
    room.leaderboard();
    expect(room.players).toBe(before);
  });

  it("works on a finished room", () => {
    let room = startedRoom("p1");
    room = room.buzz({ playerId: "p1", at: 1000 }).validate("correct").playNextTrack();
    room = room.buzz({ playerId: "p1", at: 2000 }).validate("correct");
    const finished = room.playNextTrack();
    expect(finished.status).toBe("finished");
    const board = finished.leaderboard();
    expect(board[0]?.score).toBe(2);
  });
});
