import { AbilityScores } from "../domain/characters/ability-scores";
import { Character } from "../domain/characters/character";
import type { CharacterRepository } from "../domain/characters/character-repository";
import type { Ability } from "../domain/rules/ability";
import type { PlayerId, SessionId } from "../domain/session/game-session";
import type { SessionRepository } from "../domain/session/session-repository";
import { CharacterAlreadyExistsError, PlayerNotInSessionError, SessionNotFoundError } from "./errors";

export interface CreateCharacterCommand {
  readonly sessionId: SessionId;
  readonly playerId: PlayerId;
  readonly name: string;
  readonly abilities: Readonly<Record<Ability, number>>;
}

export class CreateCharacter {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly characters: CharacterRepository,
  ) {}

  async execute(cmd: CreateCharacterCommand): Promise<Character> {
    const session = await this.sessions.get(cmd.sessionId);
    if (!session) throw new SessionNotFoundError(cmd.sessionId);
    if (!session.players.includes(cmd.playerId)) throw new PlayerNotInSessionError(cmd.playerId, cmd.sessionId);
    if (await this.characters.find(cmd.sessionId, cmd.playerId)) {
      throw new CharacterAlreadyExistsError(cmd.playerId, cmd.sessionId);
    }

    const character = Character.create(
      cmd.sessionId,
      cmd.playerId,
      cmd.name,
      AbilityScores.fromStandardArray(cmd.abilities),
    );
    await this.characters.save(character);
    return character;
  }
}
