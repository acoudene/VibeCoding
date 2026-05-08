import type { Clock } from "@/application/ports/clock";
import type { RealtimeChannel } from "@/application/ports/realtime-channel";
import type { RoomRepository } from "@/application/ports/room-repository";
import type { PlayerId } from "@/domain/player";
import { RoomCode } from "@/domain/room-code";

import { RoomNotFoundError } from "./join-room";

export type BuzzInput = {
  code: string;
  playerId: PlayerId;
};

export type BuzzDeps = {
  repo: RoomRepository;
  channel: RealtimeChannel;
  clock: Clock;
};

export class Buzz {
  constructor(private readonly deps: BuzzDeps) {}

  async execute(input: BuzzInput): Promise<void> {
    const code = RoomCode.normalize(input.code);
    const room = await this.deps.repo.find(code);
    if (room === null) throw new RoomNotFoundError(code);
    const updated = room.buzz({ playerId: input.playerId, at: this.deps.clock.now() });
    await this.deps.repo.save(updated);
    const buzzer = updated.players.find((p) => p.id === input.playerId);
    await this.deps.channel.publish(`room-${code}`, "buzz:taken", {
      playerId: input.playerId,
      nickname: buzzer?.nickname ?? input.playerId,
    });
  }
}
