import { describe, expect, it } from "vitest";

import { CreateRoom } from "@/application/use-cases/create-room";
import { JoinRoom } from "@/application/use-cases/join-room";
import { PostChatMessage } from "@/application/use-cases/post-chat-message";
import { NotHostError } from "@/application/use-cases/start-game";
import { ToggleChat } from "@/application/use-cases/toggle-chat";
import {
  ChatClosedError,
  ChatCooldownError,
  ChatEmptyError,
  ChatTooLongError,
} from "@/domain/chat";
import { Playlist } from "@/domain/playlist";
import { Track } from "@/domain/track";

import {
  FakeChatRepository,
  FakeClock,
  FakeCodeGenerator,
  FakeRealtimeChannel,
  FakeRoomRepository,
} from "../test-doubles";

const makePlaylist = () =>
  Playlist.create({
    id: "pl",
    name: "p",
    tracks: [Track.create({ expectedTitle: "t0", expectedArtist: "a", youtubeId: "dQw4w9WgXcQ" })],
  });

const setup = async () => {
  const rooms = new FakeRoomRepository();
  const chats = new FakeChatRepository();
  const channel = new FakeRealtimeChannel();
  const clock = new FakeClock();
  await new CreateRoom({
    repo: rooms,
    channel,
    clock,
    codeGenerator: new FakeCodeGenerator(["ABCDEF"]),
  }).execute({ hostId: "host-1", playlist: makePlaylist() });
  await new JoinRoom({ repo: rooms, channel }).execute({
    code: "ABCDEF",
    playerId: "p1",
    nickname: "Alice",
  });
  channel.published.length = 0;
  return {
    rooms,
    chats,
    channel,
    clock,
    post: new PostChatMessage({ rooms, chats, channel, clock }),
    toggle: new ToggleChat({ rooms, chats, channel }),
  };
};

describe("PostChatMessage", () => {
  it("publishes chat:message and persists the message", async () => {
    const { post, channel, chats } = await setup();
    await post.execute({ code: "ABCDEF", authorId: "p1", text: "hello" });
    const ev = channel.eventsOn("room-ABCDEF").find((e) => e.event === "chat:message");
    expect(ev).toBeDefined();
    const persisted = await chats.find("ABCDEF");
    expect(persisted?.messages).toHaveLength(1);
    expect(persisted?.messages[0]?.text).toBe("hello");
    expect(persisted?.messages[0]?.role).toBe("player");
  });

  it("tags the host with role 'host'", async () => {
    const { post, chats } = await setup();
    await post.execute({ code: "ABCDEF", authorId: "host-1", text: "salut" });
    const persisted = await chats.find("ABCDEF");
    expect(persisted?.messages[0]?.role).toBe("host");
  });

  it("propagates R13 errors (empty, too long, cooldown)", async () => {
    const { post, clock } = await setup();
    await expect(
      post.execute({ code: "ABCDEF", authorId: "p1", text: "  " }),
    ).rejects.toBeInstanceOf(ChatEmptyError);
    await expect(
      post.execute({ code: "ABCDEF", authorId: "p1", text: "a".repeat(201) }),
    ).rejects.toBeInstanceOf(ChatTooLongError);
    await post.execute({ code: "ABCDEF", authorId: "p1", text: "first" });
    clock.advance(100);
    await expect(
      post.execute({ code: "ABCDEF", authorId: "p1", text: "second" }),
    ).rejects.toBeInstanceOf(ChatCooldownError);
  });

  it("blocks non-host non-player authors", async () => {
    const { post } = await setup();
    await expect(
      post.execute({ code: "ABCDEF", authorId: "ghost", text: "spy" }),
    ).rejects.toThrow();
  });
});

describe("ToggleChat", () => {
  it("toggles isOpen and publishes chat:toggled", async () => {
    const { toggle, chats, channel } = await setup();
    await toggle.execute({ code: "ABCDEF", hostId: "host-1" });
    expect((await chats.find("ABCDEF"))?.isOpen).toBe(false);
    expect(channel.lastEvent("room-ABCDEF")?.event).toBe("chat:toggled");
    expect(channel.lastEvent("room-ABCDEF")?.payload).toEqual({ isOpen: false });
    await toggle.execute({ code: "ABCDEF", hostId: "host-1" });
    expect((await chats.find("ABCDEF"))?.isOpen).toBe(true);
  });

  it("rejects non-host callers", async () => {
    const { toggle } = await setup();
    await expect(
      toggle.execute({ code: "ABCDEF", hostId: "p1" }),
    ).rejects.toBeInstanceOf(NotHostError);
  });

  it("when closed, players are blocked but the host can still post", async () => {
    const { toggle, post } = await setup();
    await toggle.execute({ code: "ABCDEF", hostId: "host-1" });
    await expect(
      post.execute({ code: "ABCDEF", authorId: "p1", text: "hi" }),
    ).rejects.toBeInstanceOf(ChatClosedError);
    await post.execute({ code: "ABCDEF", authorId: "host-1", text: "annonce" });
  });
});
