import type { RealtimeChannel } from "@/application/ports/realtime-channel";
import type { RoomRepository } from "@/application/ports/room-repository";
import type { PlayerId } from "@/domain/player";
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
};

export class JoinRoom {
  constructor(private readonly deps: JoinRoomDeps) {}

  async execute(input: JoinRoomInput): Promise<void> {
    const code = RoomCode.normalize(input.code);
    const room = await this.deps.repo.find(code);
    if (room === null) throw new RoomNotFoundError(code);
    const updated = room.join({ playerId: input.playerId, nickname: input.nickname });
    await this.deps.repo.save(updated);
    await this.deps.channel.publish(`room-${code}`, "player:joined", {
      playerId: input.playerId,
      nickname: input.nickname,
    });
  }
}
