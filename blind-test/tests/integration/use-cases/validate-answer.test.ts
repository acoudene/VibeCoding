import { describe, expect, it } from "vitest";

import { Buzz } from "@/application/use-cases/buzz";
import { CreateRoom } from "@/application/use-cases/create-room";
import { JoinRoom, RoomNotFoundError } from "@/application/use-cases/join-room";
import { NotHostError, StartGame } from "@/application/use-cases/start-game";
import { ValidateAnswer } from "@/application/use-cases/validate-answer";
import { Playlist } from "@/domain/playlist";
import { InvalidValidationError } from "@/domain/room";
import { Track } from "@/domain/track";

import {
  FakeClock,
  FakeCodeGenerator,
  FakeRealtimeChannel,
  FakeRoomRepository,
} from "../test-doubles";

const makePlaylist = (n = 2) =>
  Playlist.create({
    id: "pl1",
    name: "p",
    tracks: Array.from({ length: n }, (_, i) =>
      Track.create({
        expectedTitle: `t${i}`,
        expectedArtist: "a",
        youtubeId: i % 2 === 0 ? "dQw4w9WgXcQ" : "dQw4w9WgXcR",
      }),
    ),
  });

const setup = async (trackCount = 2) => {
  const repo = new FakeRoomRepository();
  const channel = new FakeRealtimeChannel();
  const clock = new FakeClock();
  const codeGenerator = new FakeCodeGenerator(["ABCDEF"]);
  await new CreateRoom({ repo, channel, clock, codeGenerator }).execute({
    hostId: "host-1",
    playlist: makePlaylist(trackCount),
  });
  const join = new JoinRoom({ repo, channel });
  await join.execute({ code: "ABCDEF", playerId: "p1", nickname: "Alice" });
  await join.execute({ code: "ABCDEF", playerId: "p2", nickname: "Bob" });
  await new StartGame({ repo, channel, clock }).execute({ code: "ABCDEF", hostId: "host-1" });
  // Advance past the buzz grace period so existing tests can buzz immediately.
  clock.advance(600);
  const buzz = new Buzz({ repo, channel, clock });
  channel.published.length = 0;
  return {
    validate: new ValidateAnswer({ repo, channel, clock }),
    buzz,
    repo,
    channel,
    clock,
  };
};

describe("ValidateAnswer", () => {
  it("on correct: scores +1, publishes round:resolved + track:ready next", async () => {
    const { validate, buzz, repo, channel } = await setup();
    await buzz.execute({ code: "ABCDEF", playerId: "p1" });
    channel.published.length = 0;
    await validate.execute({ code: "ABCDEF", hostId: "host-1", outcome: "correct" });
    const events = channel.eventsOn("presence-room-ABCDEF");
    expect(events.map((e) => e.event)).toEqual(["round:resolved", "track:ready"]);
    expect(events[0]?.payload).toMatchObject({ outcome: "correct" });
    expect(events[1]?.payload).toMatchObject({ trackIndex: 1 });
    const room = await repo.find("ABCDEF");
    expect(room?.players.find((p) => p.id === "p1")?.score).toBe(1);
    expect(room?.rounds).toHaveLength(2);
  });

  it("on half: scores +0.5, advances to next track", async () => {
    const { validate, buzz, repo } = await setup();
    await buzz.execute({ code: "ABCDEF", playerId: "p1" });
    await validate.execute({ code: "ABCDEF", hostId: "host-1", outcome: "half" });
    const room = await repo.find("ABCDEF");
    expect(room?.players.find((p) => p.id === "p1")?.score).toBe(0.5);
    expect(room?.rounds).toHaveLength(2);
  });

  it("on skip from playing: advances without scoring", async () => {
    const { validate, repo, channel } = await setup();
    await validate.execute({ code: "ABCDEF", hostId: "host-1", outcome: "skip" });
    const room = await repo.find("ABCDEF");
    expect(room?.players.every((p) => p.score === 0)).toBe(true);
    expect(room?.rounds).toHaveLength(2);
    expect(channel.eventsOn("presence-room-ABCDEF").map((e) => e.event)).toEqual([
      "round:resolved",
      "track:ready",
    ]);
  });

  it("on wrong: blocks the buzzer, round goes back to playing, no track:ready", async () => {
    const { validate, buzz, repo, channel } = await setup();
    await buzz.execute({ code: "ABCDEF", playerId: "p1" });
    channel.published.length = 0;
    await validate.execute({ code: "ABCDEF", hostId: "host-1", outcome: "wrong" });
    const events = channel.eventsOn("presence-room-ABCDEF");
    expect(events.map((e) => e.event)).toEqual(["round:resolved"]);
    const room = await repo.find("ABCDEF");
    expect(room?.rounds.at(-1)?.status).toBe("playing");
    expect(room?.rounds.at(-1)?.blockedPlayerIds.has("p1")).toBe(true);
  });

  it("on the last track correct: publishes round:resolved + game:finished with leaderboard", async () => {
    const { validate, buzz, repo, channel } = await setup(1); // single track
    await buzz.execute({ code: "ABCDEF", playerId: "p1" });
    channel.published.length = 0;
    await validate.execute({ code: "ABCDEF", hostId: "host-1", outcome: "correct" });
    const events = channel.eventsOn("presence-room-ABCDEF");
    expect(events.map((e) => e.event)).toEqual(["round:resolved", "game:finished"]);
    expect(events[1]?.payload).toMatchObject({ leaderboard: expect.any(Array) });
    const room = await repo.find("ABCDEF");
    expect(room?.status).toBe("finished");
  });

  it("publishes scores in round:resolved payload", async () => {
    const { validate, buzz, channel } = await setup();
    await buzz.execute({ code: "ABCDEF", playerId: "p1" });
    channel.published.length = 0;
    await validate.execute({ code: "ABCDEF", hostId: "host-1", outcome: "correct" });
    const resolved = channel.eventsOn("presence-room-ABCDEF")[0];
    expect(resolved?.payload).toMatchObject({
      outcome: "correct",
      scores: expect.arrayContaining([expect.objectContaining({ playerId: "p1", score: 1 })]),
    });
  });

  it("throws NotHostError when caller is not the host", async () => {
    const { validate, buzz } = await setup();
    await buzz.execute({ code: "ABCDEF", playerId: "p1" });
    await expect(
      validate.execute({ code: "ABCDEF", hostId: "intruder", outcome: "correct" }),
    ).rejects.toThrow(NotHostError);
  });

  it("throws RoomNotFoundError for unknown code", async () => {
    const { validate } = await setup();
    await expect(
      validate.execute({ code: "ZZZZZZ", hostId: "host-1", outcome: "skip" }),
    ).rejects.toThrow(RoomNotFoundError);
  });

  it("propagates InvalidValidationError when round status is wrong", async () => {
    const { validate } = await setup();
    // No buzz yet, round is "playing" -> correct is invalid.
    await expect(
      validate.execute({ code: "ABCDEF", hostId: "host-1", outcome: "correct" }),
    ).rejects.toThrow(InvalidValidationError);
  });

  it("normalizes the code", async () => {
    const { validate, buzz } = await setup();
    await buzz.execute({ code: "ABCDEF", playerId: "p1" });
    await validate.execute({ code: "abcdef", hostId: "host-1", outcome: "correct" });
    // No throw = success
  });
});
