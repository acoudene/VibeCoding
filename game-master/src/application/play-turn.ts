import type { CharacterRepository } from "../domain/characters/character-repository";
import type { Ability } from "../domain/rules/ability";
import { resolveAbilityCheck, type AbilityCheckResult } from "../domain/rules/ability-check";
import type { DiceRoller } from "../domain/rules/dice-roller";
import type { PlayerId, SessionId, Turn } from "../domain/session/game-session";
import type { SessionRepository } from "../domain/session/session-repository";
import { CharacterRequiredError, PlayerNotInSessionError, SessionNotFoundError } from "./errors";
import type { NarratorAgent } from "./game-master/agents/narrator";
import type { RulesArbiterAgent } from "./game-master/agents/rules-arbiter";

export interface PlayTurnCommand {
  readonly sessionId: SessionId;
  readonly playerId: PlayerId;
  readonly action: string;
}

/** Cas d'usage : le Game Master (agents) arbitre et narre un tour. Les règles restent déterministes (domaine). */
export class PlayTurn {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly characters: CharacterRepository,
    private readonly arbiter: RulesArbiterAgent,
    private readonly narrator: NarratorAgent,
    private readonly dice: DiceRoller,
  ) {}

  async execute(cmd: PlayTurnCommand): Promise<Turn> {
    const session = await this.sessions.get(cmd.sessionId);
    if (!session) throw new SessionNotFoundError(cmd.sessionId);
    if (!session.hasPlayer(cmd.playerId)) throw new PlayerNotInSessionError(cmd.playerId, cmd.sessionId);
    const character = await this.characters.find(cmd.sessionId, cmd.playerId);
    if (!character) throw new CharacterRequiredError(cmd.playerId, cmd.sessionId);

    const request = await this.arbiter.assess(cmd.action);
    const outcome = request.required
      ? describe(
          request.ability,
          resolveAbilityCheck(character.abilities.get(request.ability), request.difficultyClass, this.dice),
        )
      : "Aucun test requis : l'action réussit.";

    const narration = await this.narrator.narrate(cmd.action, outcome);
    const turn = session.recordTurn(cmd.playerId, cmd.action, narration);
    await this.sessions.save(session);
    return turn;
  }
}

function describe(ability: Ability, r: AbilityCheckResult): string {
  const sign = r.modifier >= 0 ? "+" : "";
  return `Test de ${ability} DD ${r.difficultyClass} : d20=${r.roll} ${sign}${r.modifier} = ${r.total} → ${r.success ? "réussite" : "échec"}.`;
}
