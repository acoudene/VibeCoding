import type { ChatRepository } from "@/application/ports/chat-repository";
import type { Clock } from "@/application/ports/clock";
import type { RealtimeChannel } from "@/application/ports/realtime-channel";
import type { RoomRepository } from "@/application/ports/room-repository";
import { roomChannel } from "@/application/room-channel";
import { Chat, type ChatRole } from "@/domain/chat";
import type { PlayerId } from "@/domain/player";
import { RoomCode } from "@/domain/room-code";

import { RoomNotFoundError } from "./join-room";

export type PostChatMessageInput = {
  code: string;
  authorId: PlayerId;
  text: string;
};

export type PostChatMessageDeps = {
  rooms: RoomRepository;
  chats: ChatRepository;
  channel: RealtimeChannel;
  clock: Clock;
};

export class PostChatMessage {
  constructor(private readonly deps: PostChatMessageDeps) {}

  async execute(input: PostChatMessageInput): Promise<void> {
    const code = RoomCode.normalize(input.code);
    const room = await this.deps.rooms.find(code);
    if (room === null) throw new RoomNotFoundError(code);
    const role: ChatRole = room.hostId === input.authorId ? "host" : "player";
    if (role === "player" && !room.players.some((p) => p.id === input.authorId)) {
      throw new RoomNotFoundError(code);
    }
    const existing = (await this.deps.chats.find(code)) ?? Chat.create(code);
    const at = this.deps.clock.now();
    const updated = existing.post({
      author: { id: input.authorId, role },
      text: input.text,
      at,
    });
    await this.deps.chats.save(updated);
    const message = updated.messages[updated.messages.length - 1]!;
    await this.deps.channel.publish(roomChannel(code), "chat:message", { message });
  }
}
