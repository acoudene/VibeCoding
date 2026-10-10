import type { PlayerId, SessionId } from "../session/game-session";
import type { Character } from "./character";

export class CharacterAlreadyExistsError extends Error {
  constructor(playerId: PlayerId, sessionId: SessionId) {
    super(`Player ${playerId} already has a character in session ${sessionId}`);
  }
}

export interface CharacterRepository {
  find(sessionId: SessionId, playerId: PlayerId): Promise<Character | undefined>;
  /**
   * Insertion seule : lève `CharacterAlreadyExistsError` si (sessionId, playerId) existe déjà.
   * L'unicité doit être garantie à l'écriture (contrainte unique côté base), pas seulement par un `find` préalable.
   */
  add(character: Character): Promise<void>;
}
