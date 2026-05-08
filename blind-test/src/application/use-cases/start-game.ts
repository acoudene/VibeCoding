import type { Clock } from "@/application/ports/clock";
import type { RealtimeChannel } from "@/application/ports/realtime-channel";
import type { RoomRepository } from "@/application/ports/room-repository";
import type { PlayerId } from "@/domain/player";
import { RoomCode } from "@/domain/room-code";

import { RoomNotFoundError } from "./join-room";

export class NotHostError extends Error {
  constructor(actualHostId: PlayerId, attemptedBy: PlayerId) {
    super(`Only the host (${actualHostId}) can perform this action; got "${attemptedBy}"`);
    this.name = "NotHostError";
  }
}

export type StartGameInput = {
  code: string;
  hostId: PlayerId;
};

export type StartGameDeps = {
  repo: RoomRepository;
  channel: RealtimeChannel;
  clock: Clock;
};

export class StartGame {
  constructor(private readonly deps: StartGameDeps) {}

  async execute(input: StartGameInput): Promise<void> {
    const code = RoomCode.normalize(input.code);
    const room = await this.deps.repo.find(code);
    if (room === null) throw new RoomNotFoundError(code);
    if (room.hostId !== input.hostId) throw new NotHostError(room.hostId, input.hostId);
    const started = room.start(this.deps.clock);
    await this.deps.repo.save(started);
    const channelName = `room-${code}`;
    await this.deps.channel.publish(channelName, "game:started", {});
    await this.deps.channel.publish(channelName, "track:ready", { trackIndex: 0 });
  }
}
