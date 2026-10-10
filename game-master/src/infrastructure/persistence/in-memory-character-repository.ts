import type { Character } from "../../domain/characters/character";
import { CharacterAlreadyExistsError, type CharacterRepository } from "../../domain/characters/character-repository";
import type { PlayerId, SessionId } from "../../domain/session/game-session";

/** Adaptateur de développement/test (l'adaptateur D1 viendra par spec dédiée). */
export class InMemoryCharacterRepository implements CharacterRepository {
  private readonly store = new Map<string, Character>();

  async find(sessionId: SessionId, playerId: PlayerId) {
    return this.store.get(key(sessionId, playerId));
  }

  async add(character: Character) {
    const k = key(character.sessionId, character.playerId);
    if (this.store.has(k)) throw new CharacterAlreadyExistsError(character.playerId, character.sessionId);
    this.store.set(k, character);
  }
}

const key = (sessionId: SessionId, playerId: PlayerId) => `${sessionId}\u0000${playerId}`;
