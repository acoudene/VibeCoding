import { describe, expect, it } from "vitest";

import { Playlist } from "@/domain/playlist";
import { Room } from "@/domain/room";
import { Track } from "@/domain/track";

import {
  FakeClock,
  FakeCodeGenerator,
  FakeRealtimeChannel,
  FakeRoomRepository,
} from "./test-doubles";

const makePlaylist = () =>
  Playlist.create({
    id: "pl1",
    name: "p",
    tracks: [
      Track.create({
        expectedTitle: "t",
        expectedArtist: "a",
        youtubeId: "dQw4w9WgXcQ",
      }),
    ],
  });

describe("FakeRoomRepository", () => {
  it("saves, finds, and deletes by code", async () => {
    const repo = new FakeRoomRepository();
    const clock = new FakeClock();
    const room = Room.create({
      code: "ABCDEF",
      hostId: "h",
      playlist: makePlaylist(),
      clock,
    });
    await repo.save(room);
    expect(await repo.find("ABCDEF")).toBe(room);
    expect(await repo.find("UNKNOWN")).toBeNull();
    await repo.delete("ABCDEF");
    expect(await repo.find("ABCDEF")).toBeNull();
  });
});

describe("FakeRealtimeChannel", () => {
  it("records published events and supports filtering by channel", async () => {
    const ch = new FakeRealtimeChannel();
    await ch.publish("room-1", "buzz:taken", { playerId: "p1" });
    await ch.publish("room-1", "round:resolved", { outcome: "correct" });
    await ch.publish("room-2", "player:joined", { nickname: "Alice" });
    expect(ch.published).toHaveLength(3);
    expect(ch.eventsOn("room-1")).toHaveLength(2);
    expect(ch.lastEvent("room-1")?.event).toBe("round:resolved");
  });

  it("returns a deterministic auth string", async () => {
    const ch = new FakeRealtimeChannel();
    const auth = await ch.authorizePresence({
      socketId: "s1",
      channelName: "presence-room-1",
      user: { id: "p1", info: { nickname: "Alice" } },
    });
    expect(auth.auth).toBe("fake-auth:p1:presence-room-1");
  });
});

describe("FakeClock", () => {
  it("returns a controllable now()", () => {
    const clock = new FakeClock(1000);
    expect(clock.now()).toBe(1000);
    clock.advance(500);
    expect(clock.now()).toBe(1500);
    clock.set(9999);
    expect(clock.now()).toBe(9999);
  });
});

describe("FakeCodeGenerator", () => {
  it("returns queued codes then falls back", () => {
    const gen = new FakeCodeGenerator(["ABCDEF", "GHJKLM"], "FALL");
    expect(gen.generate()).toBe("ABCDEF");
    expect(gen.generate()).toBe("GHJKLM");
    expect(gen.generate()).toBe("FALL");
  });

  it("can be pushed at runtime", () => {
    const gen = new FakeCodeGenerator();
    gen.push("HELLO5");
    expect(gen.generate()).toBe("HELLO5");
  });
});
