import type { ChatRepository } from "@/application/ports/chat-repository";
import type { RealtimeChannel } from "@/application/ports/realtime-channel";
import type { RoomRepository } from "@/application/ports/room-repository";
import { roomChannel } from "@/application/room-channel";
import { Chat, type ChatMessage } from "@/domain/chat";
import type { PlayerId } from "@/domain/player";
import type { RoomMode } from "@/domain/room";
import { RoomCode } from "@/domain/room-code";

export class RoomNotFoundError extends Error {
  constructor(code: string) {
    super(`Room with code "${code}" not found`);
    this.name = "RoomNotFoundError";
  }
}

export type JoinRoomInput = {
  code: string;
  playerId: PlayerId;
  nickname: string;
};

export type JoinRoomDeps = {
  repo: RoomRepository;
  channel: RealtimeChannel;
  chatRepo?: ChatRepository;
};

export type JoinRoomOutput = {
  mode: RoomMode;
  chat: {
    isOpen: boolean;
    messages: ReadonlyArray<ChatMessage>;
  };
};

export class JoinRoom {
  constructor(private readonly deps: JoinRoomDeps) {}

  async execute(input: JoinRoomInput): Promise<JoinRoomOutput> {
    const code = RoomCode.normalize(input.code);
    const room = await this.deps.repo.find(code);
    if (room === null) throw new RoomNotFoundError(code);
    const isReconnect = room.players.some((p) => p.id === input.playerId);
    const updated = isReconnect
      ? room.reconnect({ playerId: input.playerId, nickname: input.nickname })
      : room.join({ playerId: input.playerId, nickname: input.nickname });
    await this.deps.repo.save(updated);
    await this.deps.channel.publish(
      roomChannel(code),
      isReconnect ? "player:reconnected" : "player:joined",
      {
        playerId: input.playerId,
        nickname: input.nickname,
      },
    );
    const chat = (await this.deps.chatRepo?.find(code)) ?? Chat.create(code);
    return {
      mode: updated.mode,
      chat: {
        isOpen: chat.isOpen,
        messages: chat.messages,
      },
    };
  }
}
