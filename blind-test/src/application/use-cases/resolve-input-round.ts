import type { Clock } from "@/application/ports/clock";
import type { RealtimeChannel } from "@/application/ports/realtime-channel";
import type { RoomRepository } from "@/application/ports/room-repository";
import { roomChannel } from "@/application/room-channel";
import type { PlayerId } from "@/domain/player";
import { RoomCode } from "@/domain/room-code";

import { RoomNotFoundError } from "./join-room";
import { NotHostError } from "./start-game";

export type ResolveInputRoundInput = {
  code: string;
  hostId: PlayerId;
};

export type ResolveInputRoundDeps = {
  repo: RoomRepository;
  channel: RealtimeChannel;
  clock: Clock;
};

export class ResolveInputRound {
  constructor(private readonly deps: ResolveInputRoundDeps) {}

  async execute(input: ResolveInputRoundInput): Promise<void> {
    const code = RoomCode.normalize(input.code);
    const room = await this.deps.repo.find(code);
    if (room === null) throw new RoomNotFoundError(code);
    if (room.hostId !== input.hostId) throw new NotHostError(room.hostId, input.hostId);

    const trackIndex = room.rounds.at(-1)?.trackIndex ?? 0;
    const expectedTrack = room.playlist.tracks[trackIndex]!;
    const resolved = room.resolveInputRound();

    const lastOutcomes = resolved.resolvedOutcomes.at(-1)!;
    const lastRound = resolved.rounds.at(-1)!;
    const submissionsPayload = resolved.players.map((p) => {
      const submission = lastRound.submissionOf(p.id);
      return {
        playerId: p.id,
        nickname: p.nickname,
        title: submission?.title,
        artist: submission?.artist,
        outcome: lastOutcomes.get(p.id) ?? "wrong",
      };
    });
    const scores = resolved.players.map((p) => ({
      playerId: p.id,
      nickname: p.nickname,
      score: p.score,
    }));

    await this.deps.channel.publish(roomChannel(code), "round:resolved:input", {
      expectedTitle: expectedTrack.expectedTitle,
      expectedArtist: expectedTrack.expectedArtist,
      submissions: submissionsPayload,
      scores,
    });

    let next = resolved;
    try {
      next = resolved.playNextTrack(this.deps.clock);
    } catch {
      // already finished
    }
    await this.deps.repo.save(next);

    if (next.status === "finished") {
      await this.deps.channel.publish(roomChannel(code), "game:finished", {
        leaderboard: next.leaderboard(),
      });
    } else {
      const nextRound = next.rounds.at(-1);
      if (nextRound) {
        await this.deps.channel.publish(roomChannel(code), "track:ready", {
          trackIndex: nextRound.trackIndex,
        });
      }
    }
  }
}
