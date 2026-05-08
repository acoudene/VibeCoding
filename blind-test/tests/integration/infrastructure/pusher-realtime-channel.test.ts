import { describe, expect, it, vi } from "vitest";

import {
  PusherRealtimeChannel,
  type PusherServerLike,
} from "@/infrastructure/realtime/pusher-realtime-channel";

const makeMockClient = (overrides: Partial<PusherServerLike> = {}): PusherServerLike => ({
  trigger: vi.fn(async () => ({})),
  authorizeChannel: vi.fn(() => ({ auth: "auth-string" })),
  ...overrides,
});

describe("PusherRealtimeChannel", () => {
  it("publish forwards to client.trigger", async () => {
    const client = makeMockClient();
    const channel = new PusherRealtimeChannel({ client });
    await channel.publish("room-ABCDEF", "buzz:taken", { playerId: "p1" });
    expect(client.trigger).toHaveBeenCalledWith("room-ABCDEF", "buzz:taken", { playerId: "p1" });
  });

  it("authorizePresence forwards to client.authorizeChannel and returns auth", async () => {
    const client = makeMockClient({
      authorizeChannel: vi.fn(() => ({ auth: "valid-auth", channel_data: "{}" })),
    });
    const channel = new PusherRealtimeChannel({ client });
    const result = await channel.authorizePresence({
      socketId: "socket-1",
      channelName: "presence-room-ABCDEF",
      user: { id: "p1", info: { nickname: "Alice" } },
    });
    expect(client.authorizeChannel).toHaveBeenCalledWith("socket-1", "presence-room-ABCDEF", {
      user_id: "p1",
      user_info: { nickname: "Alice" },
    });
    expect(result).toEqual({ auth: "valid-auth", channel_data: "{}" });
  });

  it("propagates errors from the underlying client", async () => {
    const client = makeMockClient({
      trigger: vi.fn(async () => {
        throw new Error("network down");
      }),
    });
    const channel = new PusherRealtimeChannel({ client });
    await expect(channel.publish("room-ABCDEF", "buzz:taken", {})).rejects.toThrow("network down");
  });
});
