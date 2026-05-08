import type { RealtimeChannel } from "@/application/ports/realtime-channel";
import type { RoomRepository } from "@/application/ports/room-repository";
import type { PlayerId } from "@/domain/player";
import type { RoomMode } from "@/domain/room";
import { RoomCode } from "@/domain/room-code";

import { RoomNotFoundError } from "./join-room";
import { NotHostError } from "./start-game";

export type SetRoomModeInput = {
  code: string;
  hostId: PlayerId;
  mode: RoomMode;
};

export type SetRoomModeDeps = {
  repo: RoomRepository;
  channel: RealtimeChannel;
};

export class SetRoomMode {
  constructor(private readonly deps: SetRoomModeDeps) {}

  async execute(input: SetRoomModeInput): Promise<void> {
    const code = RoomCode.normalize(input.code);
    const room = await this.deps.repo.find(code);
    if (room === null) throw new RoomNotFoundError(code);
    if (room.hostId !== input.hostId) throw new NotHostError(room.hostId, input.hostId);
    const updated = room.setMode(input.mode);
    await this.deps.repo.save(updated);
    await this.deps.channel.publish(`room-${code}`, "room:mode-changed", { mode: input.mode });
  }
}
