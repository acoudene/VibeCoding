import { describe, expect, it } from "vitest";

import { CreateRoom } from "@/application/use-cases/create-room";
import { JoinRoom, RoomNotFoundError } from "@/application/use-cases/join-room";
import { Playlist } from "@/domain/playlist";
import { DuplicateNicknameError, HostCannotJoinError, RoomFullError } from "@/domain/room";
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
  const create = new CreateRoom({ repo, channel, clock, codeGenerator });
  await create.execute({ hostId: "host-1", playlist: makePlaylist() });
  channel.published.length = 0; // ignore room:created from setup
  const join = new JoinRoom({ repo, channel });
  return { join, repo, channel };
};

describe("JoinRoom", () => {
  it("adds the player to the room and persists the change", async () => {
    const { join, repo } = await setup();
    await join.execute({ code: "ABCDEF", playerId: "p1", nickname: "Alice" });
    const room = await repo.find("ABCDEF");
    expect(room?.players).toHaveLength(1);
    expect(room?.players[0]?.id).toBe("p1");
    expect(room?.players[0]?.nickname).toBe("Alice");
  });

  it("publishes player:joined on the room channel", async () => {
    const { join, channel } = await setup();
    await join.execute({ code: "ABCDEF", playerId: "p1", nickname: "Alice" });
    const events = channel.eventsOn("room-ABCDEF");
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toBe("player:joined");
    expect(events[0]?.payload).toMatchObject({ playerId: "p1", nickname: "Alice" });
  });

  it("normalizes the code (case-insensitive lookup)", async () => {
    const { join, repo } = await setup();
    await join.execute({ code: "abcdef", playerId: "p1", nickname: "Alice" });
    const room = await repo.find("ABCDEF");
    expect(room?.players).toHaveLength(1);
  });

  it("throws RoomNotFoundError for an unknown code", async () => {
    const { join } = await setup();
    await expect(
      join.execute({ code: "ZZZZZZ", playerId: "p1", nickname: "Alice" }),
    ).rejects.toThrow(RoomNotFoundError);
  });

  it("propagates DuplicateNicknameError from the domain", async () => {
    const { join } = await setup();
    await join.execute({ code: "ABCDEF", playerId: "p1", nickname: "Alice" });
    await expect(
      join.execute({ code: "ABCDEF", playerId: "p2", nickname: "alice" }),
    ).rejects.toThrow(DuplicateNicknameError);
  });

  it("propagates HostCannotJoinError from the domain", async () => {
    const { join } = await setup();
    await expect(
      join.execute({ code: "ABCDEF", playerId: "host-1", nickname: "Host" }),
    ).rejects.toThrow(HostCannotJoinError);
  });

  it("propagates RoomFullError from the domain", async () => {
    const { join } = await setup();
    for (let i = 1; i <= 8; i++) {
      await join.execute({ code: "ABCDEF", playerId: `p${i}`, nickname: `P${i}` });
    }
    await expect(join.execute({ code: "ABCDEF", playerId: "p9", nickname: "P9" })).rejects.toThrow(
      RoomFullError,
    );
  });

  it("does not save when the domain rejects the join", async () => {
    const { join, repo } = await setup();
    await join.execute({ code: "ABCDEF", playerId: "p1", nickname: "Alice" });
    await expect(
      join.execute({ code: "ABCDEF", playerId: "p2", nickname: "alice" }),
    ).rejects.toThrow(DuplicateNicknameError);
    const room = await repo.find("ABCDEF");
    expect(room?.players).toHaveLength(1);
  });

  it("does not publish when the domain rejects the join", async () => {
    const { join, channel } = await setup();
    await expect(
      join.execute({ code: "ABCDEF", playerId: "host-1", nickname: "Host" }),
    ).rejects.toThrow(HostCannotJoinError);
    expect(channel.eventsOn("room-ABCDEF")).toHaveLength(0);
  });
});
