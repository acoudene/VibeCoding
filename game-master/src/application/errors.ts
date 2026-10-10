export class SessionNotFoundError extends Error {
  constructor(id: string) {
    super(`Session ${id} not found`);
  }
}

export class PlayerNotInSessionError extends Error {
  constructor(playerId: string, sessionId: string) {
    super(`Player ${playerId} is not in session ${sessionId}`);
  }
}

export class CharacterRequiredError extends Error {
  constructor(playerId: string, sessionId: string) {
    super(`Player ${playerId} has no character in session ${sessionId}`);
  }
}

export class InvalidArbiterResponseError extends Error {
  constructor() {
    super("RulesArbiter returned an invalid response");
  }
}

// Erreurs de validation du domaine, ré-exportées pour que la présentation n'importe que l'application.
export { InvalidAbilityAssignmentError } from "../domain/characters/ability-scores";
export { CharacterNameRequiredError } from "../domain/characters/character";
export { CharacterAlreadyExistsError } from "../domain/characters/character-repository";
