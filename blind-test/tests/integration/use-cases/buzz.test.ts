import { describe, expect, it } from "vitest";

import { Buzz } from "@/application/use-cases/buzz";
import { CreateRoom } from "@/application/use-cases/create-room";
import { JoinRoom, RoomNotFoundError } from "@/application/use-cases/join-room";
import { StartGame } from "@/application/use-cases/start-game";
import { Playlist } from "@/domain/playlist";
import {
  BuzzAlreadyTakenError,
  BuzzTooEarlyError,
  GameNotInProgressError,
  PlayerNotInRoomError,
} from "@/domain/room";
import { Track } from "@/domain/track";

import {
  FakeClock,
  FakeCodeGenerator,
  FakeRealtimeChannel,
  FakeRoomRepository,
} from "../test-doubles";

const makePlaylist = () =>
  Playlist.create({
    id: "pl1",
    name: "p",
    tracks: [
      Track.create({ expectedTitle: "t1", expectedArtist: "a", youtubeId: "dQw4w9WgXcQ" }),
      Track.create({ expectedTitle: "t2", expectedArtist: "a", youtubeId: "dQw4w9WgXcR" }),
    ],
  });

const setup = async (start = true) => {
  const repo = new FakeRoomRepository();
  const channel = new FakeRealtimeChannel();
  const clock = new FakeClock(1_000_000);
  const codeGenerator = new FakeCodeGenerator(["ABCDEF"]);
  await new CreateRoom({ repo, channel, clock, codeGenerator }).execute({
    hostId: "host-1",
    playlist: makePlaylist(),
  });
  const join = new JoinRoom({ repo, channel });
  await join.execute({ code: "ABCDEF", playerId: "p1", nickname: "Alice" });
  await join.execute({ code: "ABCDEF", playerId: "p2", nickname: "Bob" });
  if (start) {
    await new StartGame({ repo, channel, clock }).execute({ code: "ABCDEF", hostId: "host-1" });
    // Advance past the buzz grace period so existing tests can buzz immediately.
    clock.advance(600);
  }
  channel.published.length = 0;
  return { buzz: new Buzz({ repo, channel, clock }), repo, channel, clock };
};

describe("Buzz", () => {
  it("marks the round as buzzed and persists it", async () => {
    const { buzz, repo } = await setup();
    await buzz.execute({ code: "ABCDEF", playerId: "p1" });
    const room = await repo.find("ABCDEF");
    expect(room?.rounds.at(-1)?.status).toBe("buzzed");
    expect(room?.rounds.at(-1)?.currentBuzzer).toBe("p1");
  });

  it("uses the injected clock for the buzz timestamp", async () => {
    const { buzz, repo, clock } = await setup();
    // Advance past the grace period; absolute value is what matters for buzzedAt.
    clock.advance(10_000);
    const expected = clock.now();
    await buzz.execute({ code: "ABCDEF", playerId: "p1" });
    const room = await repo.find("ABCDEF");
    expect(room?.rounds.at(-1)?.buzzedAt).toBe(expected);
  });

  it("publishes buzz:taken with playerId and nickname", async () => {
    const { buzz, channel } = await setup();
    await buzz.execute({ code: "ABCDEF", playerId: "p1" });
    const events = channel.eventsOn("presence-room-ABCDEF");
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toBe("buzz:taken");
    expect(events[0]?.payload).toMatchObject({ playerId: "p1", nickname: "Alice" });
  });

  it("normalizes the code", async () => {
    const { buzz, channel } = await setup();
    await buzz.execute({ code: "abcdef", playerId: "p1" });
    expect(channel.eventsOn("presence-room-ABCDEF")).toHaveLength(1);
  });

  it("throws RoomNotFoundError for an unknown code", async () => {
    const { buzz } = await setup();
    await expect(buzz.execute({ code: "ZZZZZZ", playerId: "p1" })).rejects.toThrow(
      RoomNotFoundError,
    );
  });

  it("propagates GameNotInProgressError if the room is still in lobby", async () => {
    const { buzz } = await setup(false);
    await expect(buzz.execute({ code: "ABCDEF", playerId: "p1" })).rejects.toThrow(
      GameNotInProgressError,
    );
  });

  it("propagates BuzzAlreadyTakenError on a second buzz", async () => {
    const { buzz } = await setup();
    await buzz.execute({ code: "ABCDEF", playerId: "p1" });
    await expect(buzz.execute({ code: "ABCDEF", playerId: "p2" })).rejects.toThrow(
      BuzzAlreadyTakenError,
    );
  });

  it("propagates PlayerNotInRoomError for a stranger", async () => {
    const { buzz } = await setup();
    await expect(buzz.execute({ code: "ABCDEF", playerId: "ghost" })).rejects.toThrow(
      PlayerNotInRoomError,
    );
  });

  it("propagates BuzzTooEarlyError when buzz arrives within the grace period", async () => {
    const repo = new FakeRoomRepository();
    const channel = new FakeRealtimeChannel();
    const clock = new FakeClock(1_000_000);
    const codeGenerator = new FakeCodeGenerator(["ABCDEF"]);
    await new CreateRoom({ repo, channel, clock, codeGenerator }).execute({
      hostId: "host-1",
      playlist: makePlaylist(),
    });
    await new JoinRoom({ repo, channel }).execute({
      code: "ABCDEF",
      playerId: "p1",
      nickname: "Alice",
    });
    await new StartGame({ repo, channel, clock }).execute({ code: "ABCDEF", hostId: "host-1" });
    clock.advance(100); // still within the 500 ms grace period
    const buzz = new Buzz({ repo, channel, clock });
    await expect(buzz.execute({ code: "ABCDEF", playerId: "p1" })).rejects.toThrow(
      BuzzTooEarlyError,
    );
  });
});
