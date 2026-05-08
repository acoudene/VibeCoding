import { describe, expect, it } from "vitest";

import { CreateRoom } from "@/application/use-cases/create-room";
import { JoinRoom } from "@/application/use-cases/join-room";
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

const setupAndSubmit = async () => {
  const repo = new FakeRoomRepository();
  const channel = new FakeRealtimeChannel();
  const clock = new FakeClock();
  await new CreateRoom({
    repo,
    channel,
    clock,
    codeGenerator: new FakeCodeGenerator(["ABCDEF"]),
  }).execute({ hostId: "host-1", playlist: makePlaylist(2) });
  const join = new JoinRoom({ repo, channel });
  await join.execute({ code: "ABCDEF", playerId: "p1", nickname: "Alice" });
  await join.execute({ code: "ABCDEF", playerId: "p2", nickname: "Bob" });
  await new SetRoomMode({ repo, channel }).execute({
    code: "ABCDEF",
    hostId: "host-1",
    mode: "input",
  });
  await new StartGame({ repo, channel, clock }).execute({ code: "ABCDEF", hostId: "host-1" });
  const submit = new SubmitAnswer({ repo, channel, clock });
  await submit.execute({ code: "ABCDEF", playerId: "p1", submission: { title: "t0", artist: "a" } });
  await submit.execute({ code: "ABCDEF", playerId: "p2", submission: { title: "t0", artist: "wrongartist" } });
  channel.published.length = 0;
  return { repo, channel, clock, resolve: new ResolveInputRound({ repo, channel, clock }) };
};

describe("ResolveInputRound", () => {
  it("publishes round:resolved:input with submissions, expected, and scores", async () => {
    const { resolve, channel } = await setupAndSubmit();
    await resolve.execute({ code: "ABCDEF", hostId: "host-1" });

    const ev = channel.eventsOn("room-ABCDEF").find((e) => e.event === "round:resolved:input");
    expect(ev).toBeDefined();
    const payload = ev!.payload as {
      expectedTitle: string;
      expectedArtist: string;
      submissions: Array<{ playerId: string; outcome: string; title?: string; artist?: string }>;
      scores: Array<{ playerId: string; score: number }>;
    };
    expect(payload.expectedTitle).toBe("t0");
    expect(payload.expectedArtist).toBe("a");
    const p1 = payload.submissions.find((s) => s.playerId === "p1")!;
    const p2 = payload.submissions.find((s) => s.playerId === "p2")!;
    expect(p1.outcome).toBe("correct");
    expect(p1.title).toBe("t0");
    expect(p2.outcome).toBe("half");
    expect(payload.scores.find((s) => s.playerId === "p1")?.score).toBe(1);
    expect(payload.scores.find((s) => s.playerId === "p2")?.score).toBe(0.5);
  });

  it("emits track:ready for the next round when not the last", async () => {
    const { resolve, channel } = await setupAndSubmit();
    await resolve.execute({ code: "ABCDEF", hostId: "host-1" });
    expect(channel.eventsOn("room-ABCDEF").some((e) => e.event === "track:ready")).toBe(true);
  });

  it("rejects non-host callers", async () => {
    const { resolve } = await setupAndSubmit();
    await expect(
      resolve.execute({ code: "ABCDEF", hostId: "p1" }),
    ).rejects.toBeInstanceOf(NotHostError);
  });
});
