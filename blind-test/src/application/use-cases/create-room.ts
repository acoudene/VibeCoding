import type { Clock } from "@/application/ports/clock";
import type { CodeGenerator } from "@/application/ports/code-generator";
import type { RealtimeChannel } from "@/application/ports/realtime-channel";
import type { RoomRepository } from "@/application/ports/room-repository";
import type { PlayerId } from "@/domain/player";
import type { Playlist } from "@/domain/playlist";
import { Room } from "@/domain/room";

const MAX_CODE_RETRIES = 5;

export class RoomCodeCollisionError extends Error {
  constructor() {
    super(`Could not generate a unique room code after ${MAX_CODE_RETRIES} attempts`);
    this.name = "RoomCodeCollisionError";
  }
}

export type CreateRoomInput = {
  hostId: PlayerId;
  playlist: Playlist;
};

export type CreateRoomOutput = {
  code: string;
};

export type CreateRoomDeps = {
  repo: RoomRepository;
  channel: RealtimeChannel;
  clock: Clock;
  codeGenerator: CodeGenerator;
};

export class CreateRoom {
  constructor(private readonly deps: CreateRoomDeps) {}

  async execute(input: CreateRoomInput): Promise<CreateRoomOutput> {
    const code = await this.allocateCode();
    const room = Room.create({
      code,
      hostId: input.hostId,
      playlist: input.playlist,
      clock: this.deps.clock,
    });
    await this.deps.repo.save(room);
    await this.deps.channel.publish(`room-${code}`, "room:created", {
      code,
      hostId: input.hostId,
    });
    return { code };
  }

  private async allocateCode(): Promise<string> {
    for (let i = 0; i < MAX_CODE_RETRIES; i++) {
      const candidate = this.deps.codeGenerator.generate();
      const existing = await this.deps.repo.find(candidate);
      if (existing === null) return candidate;
    }
    throw new RoomCodeCollisionError();
  }
}
