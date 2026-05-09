import type { RealtimeChannel } from "@/application/ports/realtime-channel";
import type { RoomRepository } from "@/application/ports/room-repository";
import type { MatchOutcome } from "@/domain/answer-matcher";
import type { PlayerId } from "@/domain/player";
import { RoomCode } from "@/domain/room-code";

import { RoomNotFoundError } from "./join-room";
import { NotHostError } from "./start-game";

export type OverrideAnswerOutcomeInput = {
  code: string;
  hostId: PlayerId;
  playerId: PlayerId;
  outcome: MatchOutcome;
};

export type OverrideAnswerOutcomeDeps = {
  repo: RoomRepository;
  channel: RealtimeChannel;
};

export class OverrideAnswerOutcome {
  constructor(private readonly deps: OverrideAnswerOutcomeDeps) {}

  async execute(input: OverrideAnswerOutcomeInput): Promise<void> {
    const code = RoomCode.normalize(input.code);
    const room = await this.deps.repo.find(code);
    if (room === null) throw new RoomNotFoundError(code);
    if (room.hostId !== input.hostId) throw new NotHostError(room.hostId, input.hostId);
    const updated = room.overrideOutcome({ playerId: input.playerId, outcome: input.outcome });
    await this.deps.repo.save(updated);
    const scores = updated.players.map((p) => ({
      playerId: p.id,
      nickname: p.nickname,
      score: p.score,
    }));
    await this.deps.channel.publish(`room-${code}`, "score:adjusted", {
      playerId: input.playerId,
      outcome: input.outcome,
      scores,
    });
  }
}
