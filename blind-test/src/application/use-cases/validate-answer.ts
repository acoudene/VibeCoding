import type { RealtimeChannel } from "@/application/ports/realtime-channel";
import type { RoomRepository } from "@/application/ports/room-repository";
import type { PlayerId } from "@/domain/player";
import { RoomCode } from "@/domain/room-code";
import type { RoundOutcome } from "@/domain/round";

import { RoomNotFoundError } from "./join-room";
import { NotHostError } from "./start-game";

export type ValidateAnswerInput = {
  code: string;
  hostId: PlayerId;
  outcome: RoundOutcome;
};

export type ValidateAnswerDeps = {
  repo: RoomRepository;
  channel: RealtimeChannel;
};

export class ValidateAnswer {
  constructor(private readonly deps: ValidateAnswerDeps) {}

  async execute(input: ValidateAnswerInput): Promise<void> {
    const code = RoomCode.normalize(input.code);
    const room = await this.deps.repo.find(code);
    if (room === null) throw new RoomNotFoundError(code);
    if (room.hostId !== input.hostId) throw new NotHostError(room.hostId, input.hostId);

    const validated = room.validate(input.outcome);
    const channelName = `room-${code}`;

    const scores = validated.players.map((p) => ({
      playerId: p.id,
      nickname: p.nickname,
      score: p.score,
    }));

    await this.deps.channel.publish(channelName, "round:resolved", {
      outcome: input.outcome,
      scores,
    });

    const currentRound = validated.rounds.at(-1);
    if (currentRound?.status !== "resolved") {
      // Wrong answer that didn't terminate (still players to buzz).
      await this.deps.repo.save(validated);
      return;
    }

    // Resolved round — try to advance.
    let next = validated;
    try {
      next = validated.playNextTrack();
    } catch {
      // Already finished or no more tracks; leave as-is.
    }

    await this.deps.repo.save(next);

    if (next.status === "finished") {
      await this.deps.channel.publish(channelName, "game:finished", {
        leaderboard: next.leaderboard(),
      });
    } else {
      const nextRound = next.rounds.at(-1);
      if (nextRound) {
        await this.deps.channel.publish(channelName, "track:ready", {
          trackIndex: nextRound.trackIndex,
        });
      }
    }
  }
}
