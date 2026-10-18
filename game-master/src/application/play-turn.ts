import { AbilityScore } from "../domain/rules/ability-score";
import { resolveAbilityCheck, type AbilityCheckResult } from "../domain/rules/ability-check";
import type { DiceRoller } from "../domain/rules/dice-roller";
import type { PlayerId, SessionId, Turn } from "../domain/session/game-session";
import type { SessionRepository } from "../domain/session/session-repository";
import type { NarratorAgent } from "./game-master/agents/narrator";
import type { RulesArbiterAgent } from "./game-master/agents/rules-arbiter";

export interface PlayTurnCommand {
  readonly sessionId: SessionId;
  readonly playerId: PlayerId;
  readonly action: string;
}

export class SessionNotFoundError extends Error {
  constructor(id: SessionId) {
    super(`Session ${id} not found`);
  }
}

/** Cas d'usage : le Game Master (agents) arbitre et narre un tour. Les règles restent déterministes (domaine). */
export class PlayTurn {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly arbiter: RulesArbiterAgent,
    private readonly narrator: NarratorAgent,
    private readonly dice: DiceRoller,
    /** Caractéristique par défaut en attendant le contexte Characters (voir docs/domain). */
    private readonly defaultScore: AbilityScore = AbilityScore.of(10),
  ) {}

  async execute(cmd: PlayTurnCommand): Promise<Turn> {
    const session = await this.sessions.get(cmd.sessionId);
    if (!session) throw new SessionNotFoundError(cmd.sessionId);

    const request = await this.arbiter.assess(cmd.action);
    const outcome = request.required
      ? describe(resolveAbilityCheck(this.defaultScore, request.difficultyClass, this.dice))
      : "Aucun test requis : l'action réussit.";

    const narration = await this.narrator.narrate(cmd.action, outcome);
    const turn = session.recordTurn(cmd.playerId, cmd.action, narration);
    await this.sessions.save(session);
    return turn;
  }
}

function describe(r: AbilityCheckResult): string {
  const sign = r.modifier >= 0 ? "+" : "";
  return `Test DD ${r.difficultyClass} : d20=${r.roll} ${sign}${r.modifier} = ${r.total} → ${r.success ? "réussite" : "échec"}.`;
}
