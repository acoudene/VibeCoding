// Contrats des événements temps réel (Pusher).
// Le canal d'une partie est `presence-game-<code>`.

import type { GameSnapshot, PublicPlayer, PublicQuestion, Reveal } from "./types";

export const channelForGame = (code: string) => `presence-game-${code.toUpperCase()}`;

export const GameEvent = {
  PlayerJoined: "player:joined",
  PlayerLeft: "player:left",
  GameStarted: "game:started",
  QuestionStarted: "question:started",
  QuestionRevealed: "question:revealed",
  GameFinished: "game:finished",
  SnapshotUpdated: "snapshot:updated",
} as const;

export type GameEventName = (typeof GameEvent)[keyof typeof GameEvent];

export interface PlayerJoinedPayload {
  player: PublicPlayer;
  players: PublicPlayer[];
}

export interface QuestionStartedPayload {
  question: PublicQuestion;
}

export interface QuestionRevealedPayload {
  reveal: Reveal;
}

export interface GameFinishedPayload {
  leaderboard: PublicPlayer[];
}

export interface SnapshotUpdatedPayload {
  snapshot: GameSnapshot;
}
