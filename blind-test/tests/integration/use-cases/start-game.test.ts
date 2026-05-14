import { describe, expect, it } from "vitest";

import { CreateRoom } from "@/application/use-cases/create-room";
import { JoinRoom } from "@/application/use-cases/join-room";
import { RoomNotFoundError } from "@/application/use-cases/join-room";
import { NotHostError, StartGame } from "@/application/use-cases/start-game";
import { Playlist } from "@/domain/playlist";
import { CannotStartEmptyRoomError, RoomNotStartableError } from "@/domain/room";
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

const setup = async (
  joiners: { id: string; nickname: string }[] = [{ id: "p1", nickname: "P1" }],
) => {
  const repo = new FakeRoomRepository();
  const channel = new FakeRealtimeChannel();
  const clock = new FakeClock();
  const codeGenerator = new FakeCodeGenerator(["ABCDEF"]);
  const create = new CreateRoom({ repo, channel, clock, codeGenerator });
  await create.execute({ hostId: "host-1", playlist: makePlaylist() });
  const join = new JoinRoom({ repo, channel });
  for (const j of joiners) {
    await join.execute({ code: "ABCDEF", playerId: j.id, nickname: j.nickname });
  }
  channel.published.length = 0; // reset to focus on StartGame events
  const start = new StartGame({ repo, channel, clock });
  return { start, repo, channel };
};

describe("StartGame", () => {
  it("transitions the room to playing and creates round 0", async () => {
    const { start, repo } = await setup();
    await start.execute({ code: "ABCDEF", hostId: "host-1" });
    const room = await repo.find("ABCDEF");
    expect(room?.status).toBe("playing");
    expect(room?.rounds).toHaveLength(1);
    expect(room?.rounds[0]?.trackIndex).toBe(0);
  });

  it("publishes game:started followed by track:ready for index 0", async () => {
    const { start, channel } = await setup();
    await start.execute({ code: "ABCDEF", hostId: "host-1" });
    const events = channel.eventsOn("presence-room-ABCDEF");
    expect(events).toHaveLength(2);
    expect(events[0]?.event).toBe("game:started");
    expect(events[1]?.event).toBe("track:ready");
    expect(events[1]?.payload).toMatchObject({ trackIndex: 0 });
  });

  it("normalizes the code", async () => {
    const { start, repo } = await setup();
    await start.execute({ code: "abcdef", hostId: "host-1" });
    expect((await repo.find("ABCDEF"))?.status).toBe("playing");
  });

  it("throws NotHostError when caller is not the host", async () => {
    const { start } = await setup();
    await expect(start.execute({ code: "ABCDEF", hostId: "intruder" })).rejects.toThrow(
      NotHostError,
    );
  });

  it("does not start when caller is not the host", async () => {
    const { start, repo, channel } = await setup();
    await expect(start.execute({ code: "ABCDEF", hostId: "intruder" })).rejects.toThrow();
    const room = await repo.find("ABCDEF");
    expect(room?.status).toBe("lobby");
    expect(channel.eventsOn("presence-room-ABCDEF")).toHaveLength(0);
  });

  it("throws RoomNotFoundError for an unknown code", async () => {
    const { start } = await setup();
    await expect(start.execute({ code: "ZZZZZZ", hostId: "host-1" })).rejects.toThrow(
      RoomNotFoundError,
    );
  });

  it("propagates CannotStartEmptyRoomError when no players have joined", async () => {
    const { start } = await setup([]); // no joiners
    await expect(start.execute({ code: "ABCDEF", hostId: "host-1" })).rejects.toThrow(
      CannotStartEmptyRoomError,
    );
  });

  it("propagates RoomNotStartableError on a second start", async () => {
    const { start } = await setup();
    await start.execute({ code: "ABCDEF", hostId: "host-1" });
    await expect(start.execute({ code: "ABCDEF", hostId: "host-1" })).rejects.toThrow(
      RoomNotStartableError,
    );
  });
});
