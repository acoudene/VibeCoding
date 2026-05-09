import "server-only";

import type { RoomRepository } from "@/application/ports/room-repository";
import { Buzz } from "@/application/use-cases/buzz";
import { CreateRoom } from "@/application/use-cases/create-room";
import { JoinRoom } from "@/application/use-cases/join-room";
import { LeaveRoom } from "@/application/use-cases/leave-room";
import { OverrideAnswerOutcome } from "@/application/use-cases/override-answer-outcome";
import { PlayTrack } from "@/application/use-cases/play-track";
import { PostChatMessage } from "@/application/use-cases/post-chat-message";
import { ResolveInputRound } from "@/application/use-cases/resolve-input-round";
import { SetRoomMode } from "@/application/use-cases/set-room-mode";
import { StartGame } from "@/application/use-cases/start-game";
import { SubmitAnswer } from "@/application/use-cases/submit-answer";
import { ToggleChat } from "@/application/use-cases/toggle-chat";
import { ValidateAnswer } from "@/application/use-cases/validate-answer";
import { RandomCodeGenerator } from "@/infrastructure/code/random-code-generator";
import { InMemoryChatRepository } from "@/infrastructure/persistence/in-memory-chat-repository";
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
  setRoomMode: SetRoomMode;
  submitAnswer: SubmitAnswer;
  resolveInputRound: ResolveInputRound;
  overrideAnswerOutcome: OverrideAnswerOutcome;
  postChatMessage: PostChatMessage;
  toggleChat: ToggleChat;
  rooms: RoomRepository;
  chats: InMemoryChatRepository;
  channel: PusherRealtimeChannel;
};

const GLOBAL_KEY = Symbol.for("blind-test.di");

function build(): Container {
  const repo = new InMemoryRoomRepository();
  const chats = new InMemoryChatRepository();
  const channel = new PusherRealtimeChannel({ config: readServerConfig() });
  const clock = new SystemClock();
  const codeGenerator = new RandomCodeGenerator();

  return {
    channel,
    rooms: repo,
    chats,
    createRoom: new CreateRoom({ repo, channel, clock, codeGenerator }),
    joinRoom: new JoinRoom({ repo, channel }),
    startGame: new StartGame({ repo, channel, clock }),
    playTrack: new PlayTrack({ repo, channel, clock }),
    buzz: new Buzz({ repo, channel, clock }),
    validateAnswer: new ValidateAnswer({ repo, channel, clock }),
    leaveRoom: new LeaveRoom({ repo, channel }),
    setRoomMode: new SetRoomMode({ repo, channel }),
    submitAnswer: new SubmitAnswer({ repo, channel, clock }),
    resolveInputRound: new ResolveInputRound({ repo, channel, clock }),
    overrideAnswerOutcome: new OverrideAnswerOutcome({ repo, channel }),
    postChatMessage: new PostChatMessage({ rooms: repo, chats, channel, clock }),
    toggleChat: new ToggleChat({ rooms: repo, chats, channel }),
  };
}

export function getContainer(): Container {
  const g = globalThis as unknown as { [k: symbol]: Container | undefined };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = build();
  }
  return g[GLOBAL_KEY]!;
}

/**
 * Test-only: replace the global container. Returns a restore function
 * that puts the previous container (or undefined) back in place.
 */
export function setContainerForTests(c: Container): () => void {
  const g = globalThis as unknown as { [k: symbol]: Container | undefined };
  const previous = g[GLOBAL_KEY];
  g[GLOBAL_KEY] = c;
  return () => {
    g[GLOBAL_KEY] = previous;
  };
}
