import type { GameSession, SessionId } from "../../domain/session/game-session";
import type { SessionRepository } from "../../domain/session/session-repository";

/** Adaptateur de développement/test. L'adaptateur de production (D1) fera l'objet d'une spec dédiée. */
export class InMemorySessionRepository implements SessionRepository {
  private readonly store = new Map<SessionId, GameSession>();

  async get(id: SessionId) {
    return this.store.get(id);
  }

  async save(session: GameSession) {
    this.store.set(session.id, session);
  }
}
