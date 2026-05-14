import { describe, expect, it } from "vitest";

import { CreateRoom } from "@/application/use-cases/create-room";
import { JoinRoom, RoomNotFoundError } from "@/application/use-cases/join-room";
import { PlayTrack } from "@/application/use-cases/play-track";
import { NotHostError, StartGame } from "@/application/use-cases/start-game";
import { Playlist } from "@/domain/playlist";
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

const setup = async () => {
  const repo = new FakeRoomRepository();
  const channel = new FakeRealtimeChannel();
  const clock = new FakeClock();
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
  channel.published.length = 0;
  return { play: new PlayTrack({ repo, channel, clock }), repo, channel, clock };
};

describe("PlayTrack", () => {
  it("publishes track:started with the trackIndex and startedAt from the clock", async () => {
    const { play, channel, clock } = await setup();
    clock.set(123_456);
    await play.execute({ code: "ABCDEF", hostId: "host-1", trackIndex: 0 });
    const events = channel.eventsOn("presence-room-ABCDEF");
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toBe("track:started");
    expect(events[0]?.payload).toMatchObject({ trackIndex: 0, startedAt: 123_456 });
  });

  it("updates the current round's startedAt with the clock value", async () => {
    const { play, repo, clock } = await setup();
    clock.set(999_999);
    await play.execute({ code: "ABCDEF", hostId: "host-1", trackIndex: 0 });
    const after = await repo.find("ABCDEF");
    expect(after?.status).toBe("playing");
    expect(after?.rounds.at(-1)?.startedAt).toBe(999_999);
  });

  it("normalizes the code", async () => {
    const { play, channel } = await setup();
    await play.execute({ code: "abcdef", hostId: "host-1", trackIndex: 0 });
    expect(channel.eventsOn("presence-room-ABCDEF")).toHaveLength(1);
  });

  it("throws NotHostError when caller is not the host", async () => {
    const { play } = await setup();
    await expect(
      play.execute({ code: "ABCDEF", hostId: "intruder", trackIndex: 0 }),
    ).rejects.toThrow(NotHostError);
  });

  it("throws RoomNotFoundError for an unknown code", async () => {
    const { play } = await setup();
    await expect(play.execute({ code: "ZZZZZZ", hostId: "host-1", trackIndex: 0 })).rejects.toThrow(
      RoomNotFoundError,
    );
  });

  it("rejects a trackIndex that does not match the current round (anti-replay)", async () => {
    const { play } = await setup();
    await expect(
      play.execute({ code: "ABCDEF", hostId: "host-1", trackIndex: 5 }),
    ).rejects.toThrow();
  });
});
