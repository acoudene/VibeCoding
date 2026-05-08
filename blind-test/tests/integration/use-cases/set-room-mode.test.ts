import { describe, expect, it } from "vitest";

import { CreateRoom } from "@/application/use-cases/create-room";
import { JoinRoom, RoomNotFoundError } from "@/application/use-cases/join-room";
import { SetRoomMode } from "@/application/use-cases/set-room-mode";
import { NotHostError, StartGame } from "@/application/use-cases/start-game";
import { Playlist } from "@/domain/playlist";
import { InvalidModeChangeError } from "@/domain/room";
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
      Track.create({ expectedTitle: "t0", expectedArtist: "a", youtubeId: "dQw4w9WgXcQ" }),
    ],
  });

const setup = async () => {
  const repo = new FakeRoomRepository();
  const channel = new FakeRealtimeChannel();
  const clock = new FakeClock();
  await new CreateRoom({
    repo,
    channel,
    clock,
    codeGenerator: new FakeCodeGenerator(["ABCDEF"]),
  }).execute({ hostId: "host-1", playlist: makePlaylist() });
  return {
    repo,
    channel,
    clock,
    setMode: new SetRoomMode({ repo, channel }),
  };
};

describe("SetRoomMode", () => {
  it("updates the room mode and publishes room:mode-changed", async () => {
    const { setMode, repo, channel } = await setup();
    await setMode.execute({ code: "ABCDEF", hostId: "host-1", mode: "input" });
    expect((await repo.find("ABCDEF"))?.mode).toBe("input");
    expect(channel.lastEvent("room-ABCDEF")?.event).toBe("room:mode-changed");
    expect(channel.lastEvent("room-ABCDEF")?.payload).toEqual({ mode: "input" });
  });

  it("rejects unknown rooms", async () => {
    const { setMode } = await setup();
    await expect(
      setMode.execute({ code: "ZZZZZZ", hostId: "host-1", mode: "input" }),
    ).rejects.toBeInstanceOf(RoomNotFoundError);
  });

  it("rejects non-host callers", async () => {
    const { setMode } = await setup();
    await expect(
      setMode.execute({ code: "ABCDEF", hostId: "p1", mode: "input" }),
    ).rejects.toBeInstanceOf(NotHostError);
  });

  it("rejects mode change once playing (R12)", async () => {
    const { setMode, repo, channel, clock } = await setup();
    await new JoinRoom({ repo, channel }).execute({
      code: "ABCDEF",
      playerId: "p1",
      nickname: "Alice",
    });
    await new StartGame({ repo, channel, clock }).execute({ code: "ABCDEF", hostId: "host-1" });
    await expect(
      setMode.execute({ code: "ABCDEF", hostId: "host-1", mode: "input" }),
    ).rejects.toBeInstanceOf(InvalidModeChangeError);
  });
});
