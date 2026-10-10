import type { Character } from "../../domain/characters/character";
import type { CharacterRepository } from "../../domain/characters/character-repository";
import type { PlayerId, SessionId } from "../../domain/session/game-session";

/** Adaptateur de développement/test (l'adaptateur D1 viendra par spec dédiée). */
export class InMemoryCharacterRepository implements CharacterRepository {
  private readonly store = new Map<string, Character>();

  async find(sessionId: SessionId, playerId: PlayerId) {
    return this.store.get(key(sessionId, playerId));
  }

  async save(character: Character) {
    this.store.set(key(character.sessionId, character.playerId), character);
  }
}

const key = (sessionId: SessionId, playerId: PlayerId) => `${sessionId}\u0000${playerId}`;
