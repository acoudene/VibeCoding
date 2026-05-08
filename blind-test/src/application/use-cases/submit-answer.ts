import type { Clock } from "@/application/ports/clock";
import type { RealtimeChannel } from "@/application/ports/realtime-channel";
import type { RoomRepository } from "@/application/ports/room-repository";
import type { PlayerId } from "@/domain/player";
import { RoomCode } from "@/domain/room-code";

import { RoomNotFoundError } from "./join-room";

export type SubmitAnswerInput = {
  code: string;
  playerId: PlayerId;
  submission: { title?: string; artist?: string };
};

export type SubmitAnswerDeps = {
  repo: RoomRepository;
  channel: RealtimeChannel;
  clock: Clock;
};

export class SubmitAnswer {
  constructor(private readonly deps: SubmitAnswerDeps) {}

  async execute(input: SubmitAnswerInput): Promise<void> {
    const code = RoomCode.normalize(input.code);
    const room = await this.deps.repo.find(code);
    if (room === null) throw new RoomNotFoundError(code);

    const at = this.deps.clock.now();
    const updated = room.submitAnswer({
      playerId: input.playerId,
      submission: input.submission,
      at,
    });
    await this.deps.repo.save(updated);

    const player = updated.players.find((p) => p.id === input.playerId);
    const nickname = player?.nickname ?? input.playerId;

    const trimmedTitle = input.submission.title?.trim();
    const trimmedArtist = input.submission.artist?.trim();
    const hasTitle = trimmedTitle !== undefined && trimmedTitle.length > 0;
    const hasArtist = trimmedArtist !== undefined && trimmedArtist.length > 0;

    await this.deps.channel.publish(`room-${code}`, "submission:received", {
      playerId: input.playerId,
      nickname,
      hasTitle,
      hasArtist,
      at,
    });

    await this.deps.channel.publish(`private-host-${code}`, "submission:received:host", {
      playerId: input.playerId,
      nickname,
      title: hasTitle ? trimmedTitle : undefined,
      artist: hasArtist ? trimmedArtist : undefined,
      at,
    });

    if (updated.allActivePlayersSubmitted()) {
      await this.deps.channel.publish(`room-${code}`, "submissions:all-received", {});
    }
  }
}
