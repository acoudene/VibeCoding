import type { RealtimeChannel } from "@/application/ports/realtime-channel";
import type { RoomRepository } from "@/application/ports/room-repository";
import { roomChannel } from "@/application/room-channel";
import type { PlayerId } from "@/domain/player";
import { RoomCode } from "@/domain/room-code";

import { RoomNotFoundError } from "./join-room";

export type LeaveRoomInput = {
  code: string;
  playerId: PlayerId;
};

export type LeaveRoomDeps = {
  repo: RoomRepository;
  channel: RealtimeChannel;
};

export class LeaveRoom {
  constructor(private readonly deps: LeaveRoomDeps) {}

  async execute(input: LeaveRoomInput): Promise<void> {
    const code = RoomCode.normalize(input.code);
    const room = await this.deps.repo.find(code);
    if (room === null) throw new RoomNotFoundError(code);
    const player = room.players.find((p) => p.id === input.playerId);
    const updated = room.leave(input.playerId);
    await this.deps.repo.save(updated);
    await this.deps.channel.publish(roomChannel(code), "player:left", {
      playerId: input.playerId,
      nickname: player?.nickname ?? input.playerId,
    });
  }
}
