import { describe, expect, it } from "vitest";

import { CreateRoom } from "@/application/use-cases/create-room";
import { JoinRoom } from "@/application/use-cases/join-room";
import { OverrideAnswerOutcome } from "@/application/use-cases/override-answer-outcome";
import { ResolveInputRound } from "@/application/use-cases/resolve-input-round";
import { SetRoomMode } from "@/application/use-cases/set-room-mode";
import { NotHostError, StartGame } from "@/application/use-cases/start-game";
import { SubmitAnswer } from "@/application/use-cases/submit-answer";
import { Playlist } from "@/domain/playlist";
import { Track } from "@/domain/track";

import {
  FakeClock,
  FakeCodeGenerator,
  FakeRealtimeChannel,
  FakeRoomRepository,
} from "../test-doubles";

const setup = async () => {
  const repo = new FakeRoomRepository();
  const channel = new FakeRealtimeChannel();
  const clock = new FakeClock();
  await new CreateRoom({
    repo,
    channel,
    clock,
    codeGenerator: new FakeCodeGenerator(["ABCDEF"]),
  }).execute({
    hostId: "host-1",
    playlist: Playlist.create({
      id: "pl",
      name: "p",
      tracks: [Track.create({ expectedTitle: "t0", expectedArtist: "a", youtubeId: "dQw4w9WgXcQ" })],
    }),
  });
  await new JoinRoom({ repo, channel }).execute({
    code: "ABCDEF",
    playerId: "p1",
    nickname: "Alice",
  });
  await new SetRoomMode({ repo, channel }).execute({
    code: "ABCDEF",
    hostId: "host-1",
    mode: "input",
  });
  await new StartGame({ repo, channel, clock }).execute({ code: "ABCDEF", hostId: "host-1" });
  await new SubmitAnswer({ repo, channel, clock }).execute({
    code: "ABCDEF",
    playerId: "p1",
    submission: { title: "t0", artist: "a" },
  });
  await new ResolveInputRound({ repo, channel, clock }).execute({
    code: "ABCDEF",
    hostId: "host-1",
  });
  channel.published.length = 0;
  return {
    repo,
    channel,
    override: new OverrideAnswerOutcome({ repo, channel }),
  };
};

describe("OverrideAnswerOutcome", () => {
  it("adjusts the player's score and publishes score:adjusted", async () => {
    const { override, repo, channel } = await setup();
    await override.execute({
      code: "ABCDEF",
      hostId: "host-1",
      playerId: "p1",
      outcome: "half",
    });
    const room = await repo.find("ABCDEF");
    expect(room?.players.find((p) => p.id === "p1")?.score).toBe(0.5);
    const ev = channel.eventsOn("room-ABCDEF").find((e) => e.event === "score:adjusted");
    expect(ev?.payload).toMatchObject({ playerId: "p1", outcome: "half" });
  });

  it("rejects non-host callers", async () => {
    const { override } = await setup();
    await expect(
      override.execute({ code: "ABCDEF", hostId: "p1", playerId: "p1", outcome: "half" }),
    ).rejects.toBeInstanceOf(NotHostError);
  });
});
