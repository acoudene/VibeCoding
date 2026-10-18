import type { GameSession, SessionId } from "./game-session";

export interface SessionRepository {
  get(id: SessionId): Promise<GameSession | undefined>;
  save(session: GameSession): Promise<void>;
}
