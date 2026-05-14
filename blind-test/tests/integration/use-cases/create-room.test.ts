import { describe, expect, it } from "vitest";

import { CreateRoom, RoomCodeCollisionError } from "@/application/use-cases/create-room";
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
    tracks: [Track.create({ expectedTitle: "t", expectedArtist: "a", youtubeId: "dQw4w9WgXcQ" })],
  });

const makeUseCase = (
  overrides: Partial<{
    repo: FakeRoomRepository;
    channel: FakeRealtimeChannel;
    clock: FakeClock;
    codeGen: FakeCodeGenerator;
  }> = {},
) => {
  const repo = overrides.repo ?? new FakeRoomRepository();
  const channel = overrides.channel ?? new FakeRealtimeChannel();
  const clock = overrides.clock ?? new FakeClock();
  const codeGen = overrides.codeGen ?? new FakeCodeGenerator(["ABCDEF"]);
  const useCase = new CreateRoom({ repo, channel, clock, codeGenerator: codeGen });
  return { useCase, repo, channel, clock, codeGen };
};

describe("CreateRoom", () => {
  it("returns the generated code", async () => {
    const { useCase } = makeUseCase();
    const result = await useCase.execute({ hostId: "host-1", playlist: makePlaylist() });
    expect(result.code).toBe("ABCDEF");
  });

  it("saves the new room in the repository", async () => {
    const { useCase, repo } = makeUseCase();
    await useCase.execute({ hostId: "host-1", playlist: makePlaylist() });
    const saved = await repo.find("ABCDEF");
    expect(saved).not.toBeNull();
    expect(saved?.hostId).toBe("host-1");
    expect(saved?.status).toBe("lobby");
  });

  it("publishes room:created on the room channel", async () => {
    const { useCase, channel } = makeUseCase();
    await useCase.execute({ hostId: "host-1", playlist: makePlaylist() });
    const events = channel.eventsOn("presence-room-ABCDEF");
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toBe("room:created");
    expect(events[0]?.payload).toMatchObject({ code: "ABCDEF", hostId: "host-1" });
  });

  it("retries with a fresh code when the first one is already taken", async () => {
    const repo = new FakeRoomRepository();
    const codeGen = new FakeCodeGenerator(["ABCDEF", "GHJKLM"]);
    const { useCase } = makeUseCase({ repo, codeGen });
    // Pre-seed a room with the first generated code
    await useCase.execute({ hostId: "host-pre", playlist: makePlaylist() });
    // Use a new gen to feed the next call (still has GHJKLM queued).
    const result = await useCase.execute({ hostId: "host-1", playlist: makePlaylist() });
    expect(result.code).toBe("GHJKLM");
    expect(await repo.find("ABCDEF")).not.toBeNull();
    expect(await repo.find("GHJKLM")).not.toBeNull();
  });

  it("throws RoomCodeCollisionError after exhausting retries", async () => {
    const repo = new FakeRoomRepository();
    // Always return the same colliding code
    const codeGen = new FakeCodeGenerator([], "ABCDEF");
    const { useCase } = makeUseCase({ repo, codeGen });
    // Pre-seed
    await useCase.execute({ hostId: "host-pre", playlist: makePlaylist() });
    await expect(useCase.execute({ hostId: "host-1", playlist: makePlaylist() })).rejects.toThrow(
      RoomCodeCollisionError,
    );
  });

  it("uses the injected clock for createdAt", async () => {
    const clock = new FakeClock(42);
    const { useCase, repo } = makeUseCase({ clock });
    await useCase.execute({ hostId: "host-1", playlist: makePlaylist() });
    const saved = await repo.find("ABCDEF");
    expect(saved?.createdAt).toBe(42);
  });
});
