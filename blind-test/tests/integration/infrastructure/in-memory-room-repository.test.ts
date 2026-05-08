import { describe, expect, it } from "vitest";

import { Playlist } from "@/domain/playlist";
import { Room } from "@/domain/room";
import { Track } from "@/domain/track";
import { InMemoryRoomRepository } from "@/infrastructure/persistence/in-memory-room-repository";

const makeRoom = (code = "ABCDEF") =>
  Room.create({
    code,
    hostId: "h",
    playlist: Playlist.create({
      id: "pl1",
      name: "p",
      tracks: [Track.create({ expectedTitle: "t", expectedArtist: "a", youtubeId: "dQw4w9WgXcQ" })],
    }),
    clock: { now: () => 1 },
  });

describe("InMemoryRoomRepository", () => {
  it("saves and finds a room by code", async () => {
    const repo = new InMemoryRoomRepository({ isolated: true });
    const room = makeRoom();
    await repo.save(room);
    expect(await repo.find("ABCDEF")).toBe(room);
  });

  it("returns null for unknown code", async () => {
    const repo = new InMemoryRoomRepository({ isolated: true });
    expect(await repo.find("ZZZZZZ")).toBeNull();
  });

  it("overwrites on save with the same code", async () => {
    const repo = new InMemoryRoomRepository({ isolated: true });
    const a = makeRoom();
    const b = makeRoom();
    await repo.save(a);
    await repo.save(b);
    expect(await repo.find("ABCDEF")).toBe(b);
  });

  it("deletes a room", async () => {
    const repo = new InMemoryRoomRepository({ isolated: true });
    await repo.save(makeRoom());
    await repo.delete("ABCDEF");
    expect(await repo.find("ABCDEF")).toBeNull();
  });

  it("shares state across non-isolated instances (HMR-safe singleton)", async () => {
    const a = new InMemoryRoomRepository();
    const b = new InMemoryRoomRepository();
    a.clear();
    await a.save(makeRoom("HMRABC"));
    expect(await b.find("HMRABC")).not.toBeNull();
    a.clear(); // cleanup so other tests don't see this entry
  });

  it("isolates state when isolated: true", async () => {
    const shared = new InMemoryRoomRepository();
    shared.clear();
    const isolated = new InMemoryRoomRepository({ isolated: true });
    await isolated.save(makeRoom("XYZ234"));
    expect(await shared.find("XYZ234")).toBeNull();
  });
});
