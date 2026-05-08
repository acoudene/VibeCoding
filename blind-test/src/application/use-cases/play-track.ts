import type { Clock } from "@/application/ports/clock";
import type { RealtimeChannel } from "@/application/ports/realtime-channel";
import type { RoomRepository } from "@/application/ports/room-repository";
import type { PlayerId } from "@/domain/player";
import { RoomCode } from "@/domain/room-code";

import { RoomNotFoundError } from "./join-room";
import { NotHostError } from "./start-game";

export class TrackIndexMismatchError extends Error {
  constructor(expected: number, got: number) {
    super(`Track index mismatch: current round is ${expected}, request asked for ${got}`);
    this.name = "TrackIndexMismatchError";
  }
}

export type PlayTrackInput = {
  code: string;
  hostId: PlayerId;
  trackIndex: number;
};

export type PlayTrackDeps = {
  repo: RoomRepository;
  channel: RealtimeChannel;
  clock: Clock;
};

export class PlayTrack {
  constructor(private readonly deps: PlayTrackDeps) {}

  async execute(input: PlayTrackInput): Promise<void> {
    const code = RoomCode.normalize(input.code);
    const room = await this.deps.repo.find(code);
    if (room === null) throw new RoomNotFoundError(code);
    if (room.hostId !== input.hostId) throw new NotHostError(room.hostId, input.hostId);

    const current = room.rounds.at(-1);
    if (!current || current.trackIndex !== input.trackIndex) {
      throw new TrackIndexMismatchError(current?.trackIndex ?? -1, input.trackIndex);
    }

    const startedAt = this.deps.clock.now();
    const updated = room.markCurrentRoundStarted(startedAt);
    await this.deps.repo.save(updated);

    await this.deps.channel.publish(`room-${code}`, "track:started", {
      trackIndex: input.trackIndex,
      startedAt,
    });
  }
}
