import type { PlayerId, SessionId } from "../session/game-session";
import type { AbilityScores } from "./ability-scores";

export class CharacterNameRequiredError extends Error {
  constructor() {
    super("Character name must not be empty");
  }
}

/** Agrégat racine : le personnage d'un joueur dans une partie (références par identifiant). */
export class Character {
  private constructor(
    readonly sessionId: SessionId,
    readonly playerId: PlayerId,
    readonly name: string,
    readonly abilities: AbilityScores,
  ) {}

  static create(sessionId: SessionId, playerId: PlayerId, name: string, abilities: AbilityScores): Character {
    const trimmed = name.trim();
    if (trimmed === "") throw new CharacterNameRequiredError();
    return new Character(sessionId, playerId, trimmed, abilities);
  }
}
