import "server-only";

import { Buzz } from "@/application/use-cases/buzz";
import { CreateRoom } from "@/application/use-cases/create-room";
import { JoinRoom } from "@/application/use-cases/join-room";
import { LeaveRoom } from "@/application/use-cases/leave-room";
import { PlayTrack } from "@/application/use-cases/play-track";
import { StartGame } from "@/application/use-cases/start-game";
import { ValidateAnswer } from "@/application/use-cases/validate-answer";
import { RandomCodeGenerator } from "@/infrastructure/code/random-code-generator";
import { InMemoryRoomRepository } from "@/infrastructure/persistence/in-memory-room-repository";
import { readServerConfig } from "@/infrastructure/realtime/pusher-config";
import { PusherRealtimeChannel } from "@/infrastructure/realtime/pusher-realtime-channel";
import { SystemClock } from "@/infrastructure/time/system-clock";

export type Container = {
  createRoom: CreateRoom;
  joinRoom: JoinRoom;
  startGame: StartGame;
  playTrack: PlayTrack;
  buzz: Buzz;
  validateAnswer: ValidateAnswer;
  leaveRoom: LeaveRoom;
  channel: PusherRealtimeChannel;
};

const GLOBAL_KEY = Symbol.for("blind-test.di");

function build(): Container {
  const repo = new InMemoryRoomRepository();
  const channel = new PusherRealtimeChannel({ config: readServerConfig() });
  const clock = new SystemClock();
  const codeGenerator = new RandomCodeGenerator();

  return {
    channel,
    createRoom: new CreateRoom({ repo, channel, clock, codeGenerator }),
    joinRoom: new JoinRoom({ repo, channel }),
    startGame: new StartGame({ repo, channel }),
    playTrack: new PlayTrack({ repo, channel }),
    buzz: new Buzz({ repo, channel, clock }),
    validateAnswer: new ValidateAnswer({ repo, channel }),
    leaveRoom: new LeaveRoom({ repo, channel }),
  };
}

export function getContainer(): Container {
  const g = globalThis as unknown as { [k: symbol]: Container | undefined };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = build();
  }
  return g[GLOBAL_KEY]!;
}
