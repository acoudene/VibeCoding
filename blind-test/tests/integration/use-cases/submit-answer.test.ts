import { describe, expect, it } from "vitest";

import { CreateRoom } from "@/application/use-cases/create-room";
import { JoinRoom } from "@/application/use-cases/join-room";
import { SetRoomMode } from "@/application/use-cases/set-room-mode";
import { StartGame } from "@/application/use-cases/start-game";
import { SubmitAnswer } from "@/application/use-cases/submit-answer";
import { Playlist } from "@/domain/playlist";
import { AlreadySubmittedError } from "@/domain/round";
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
      Track.create({ expectedTitle: "One More Time", expectedArtist: "Daft Punk", youtubeId: "dQw4w9WgXcQ" }),
    ],
  });

const setupInputRoom = async (...playerIds: string[]) => {
  const repo = new FakeRoomRepository();
  const channel = new FakeRealtimeChannel();
  const clock = new FakeClock();
  await new CreateRoom({
    repo,
    channel,
    clock,
    codeGenerator: new FakeCodeGenerator(["ABCDEF"]),
  }).execute({ hostId: "host-1", playlist: makePlaylist() });
  for (const id of playerIds) {
    await new JoinRoom({ repo, channel }).execute({ code: "ABCDEF", playerId: id, nickname: id });
  }
  await new SetRoomMode({ repo, channel }).execute({
    code: "ABCDEF",
    hostId: "host-1",
    mode: "input",
  });
  await new StartGame({ repo, channel, clock }).execute({ code: "ABCDEF", hostId: "host-1" });
  channel.published.length = 0;
  return {
    repo,
    channel,
    clock,
    submit: new SubmitAnswer({ repo, channel, clock }),
  };
};

describe("SubmitAnswer", () => {
  it("publishes a masked event on the public channel and a clear event on the private-host channel", async () => {
    const { submit, channel } = await setupInputRoom("p1");
    await submit.execute({
      code: "ABCDEF",
      playerId: "p1",
      submission: { title: "One More Time", artist: "Daft Punk" },
    });

    const publicEvents = channel.eventsOn("presence-room-ABCDEF");
    const privateEvents = channel.eventsOn("private-host-ABCDEF");

    const masked = publicEvents.find((e) => e.event === "submission:received");
    expect(masked?.payload).toMatchObject({
      playerId: "p1",
      nickname: "p1",
      hasTitle: true,
      hasArtist: true,
    });
    // Anti-leak: the public payload must NOT contain the title or artist text.
    const maskedJson = JSON.stringify(masked?.payload ?? {});
    expect(maskedJson).not.toContain("One More Time");
    expect(maskedJson).not.toContain("Daft Punk");

    const priv = privateEvents.find((e) => e.event === "submission:received:host");
    expect(priv?.payload).toMatchObject({
      playerId: "p1",
      title: "One More Time",
      artist: "Daft Punk",
    });
  });

  it("emits submissions:all-received when every player has submitted", async () => {
    const { submit, channel } = await setupInputRoom("p1", "p2");
    await submit.execute({ code: "ABCDEF", playerId: "p1", submission: { title: "x" } });
    expect(channel.eventsOn("presence-room-ABCDEF").some((e) => e.event === "submissions:all-received")).toBe(
      false,
    );
    await submit.execute({ code: "ABCDEF", playerId: "p2", submission: { title: "x" } });
    expect(channel.eventsOn("presence-room-ABCDEF").some((e) => e.event === "submissions:all-received")).toBe(
      true,
    );
  });

  it("rejects a second submission from the same player (R10)", async () => {
    const { submit } = await setupInputRoom("p1");
    await submit.execute({ code: "ABCDEF", playerId: "p1", submission: { title: "first" } });
    await expect(
      submit.execute({ code: "ABCDEF", playerId: "p1", submission: { title: "second" } }),
    ).rejects.toBeInstanceOf(AlreadySubmittedError);
  });
});
