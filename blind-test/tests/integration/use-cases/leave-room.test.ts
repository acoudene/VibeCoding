import { describe, expect, it } from "vitest";

import { CreateRoom } from "@/application/use-cases/create-room";
import { JoinRoom, RoomNotFoundError } from "@/application/use-cases/join-room";
import { LeaveRoom } from "@/application/use-cases/leave-room";
import { Playlist } from "@/domain/playlist";
import { PlayerNotInRoomError } from "@/domain/room";
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
    tracks: [Track.create({ expectedTitle: "t", expectedArtist: "a", youtubeId: "dQw4w9WgXcQ" })],
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
  channel.published.length = 0;
  return { leave: new LeaveRoom({ repo, channel }), repo, channel };
};

describe("LeaveRoom", () => {
  it("flags the player as disconnected and persists", async () => {
    const { leave, repo } = await setup();
    await leave.execute({ code: "ABCDEF", playerId: "p1" });
    const room = await repo.find("ABCDEF");
    expect(room?.players[0]?.connected).toBe(false);
  });

  it("publishes player:left with playerId and nickname", async () => {
    const { leave, channel } = await setup();
    await leave.execute({ code: "ABCDEF", playerId: "p1" });
    const events = channel.eventsOn("presence-room-ABCDEF");
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toBe("player:left");
    expect(events[0]?.payload).toMatchObject({ playerId: "p1", nickname: "Alice" });
  });

  it("normalizes the code", async () => {
    const { leave, repo } = await setup();
    await leave.execute({ code: "abcdef", playerId: "p1" });
    expect((await repo.find("ABCDEF"))?.players[0]?.connected).toBe(false);
  });

  it("throws RoomNotFoundError on unknown code", async () => {
    const { leave } = await setup();
    await expect(leave.execute({ code: "ZZZZZZ", playerId: "p1" })).rejects.toThrow(
      RoomNotFoundError,
    );
  });

  it("propagates PlayerNotInRoomError for unknown player", async () => {
    const { leave } = await setup();
    await expect(leave.execute({ code: "ABCDEF", playerId: "ghost" })).rejects.toThrow(
      PlayerNotInRoomError,
    );
  });

  it("does not save or publish on error", async () => {
    const { leave, repo, channel } = await setup();
    await expect(leave.execute({ code: "ABCDEF", playerId: "ghost" })).rejects.toThrow();
    const room = await repo.find("ABCDEF");
    expect(room?.players[0]?.connected).toBe(true);
    expect(channel.eventsOn("presence-room-ABCDEF")).toHaveLength(0);
  });
});
