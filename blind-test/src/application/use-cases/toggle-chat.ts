import type { ChatRepository } from "@/application/ports/chat-repository";
import type { RealtimeChannel } from "@/application/ports/realtime-channel";
import type { RoomRepository } from "@/application/ports/room-repository";
import { Chat } from "@/domain/chat";
import type { PlayerId } from "@/domain/player";
import { RoomCode } from "@/domain/room-code";

import { RoomNotFoundError } from "./join-room";
import { NotHostError } from "./start-game";

export type ToggleChatInput = {
  code: string;
  hostId: PlayerId;
};

export type ToggleChatDeps = {
  rooms: RoomRepository;
  chats: ChatRepository;
  channel: RealtimeChannel;
};

export class ToggleChat {
  constructor(private readonly deps: ToggleChatDeps) {}

  async execute(input: ToggleChatInput): Promise<void> {
    const code = RoomCode.normalize(input.code);
    const room = await this.deps.rooms.find(code);
    if (room === null) throw new RoomNotFoundError(code);
    if (room.hostId !== input.hostId) throw new NotHostError(room.hostId, input.hostId);
    const existing = (await this.deps.chats.find(code)) ?? Chat.create(code);
    const toggled = existing.toggle();
    await this.deps.chats.save(toggled);
    await this.deps.channel.publish(`room-${code}`, "chat:toggled", { isOpen: toggled.isOpen });
  }
}
