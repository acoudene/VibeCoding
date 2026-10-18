import type { AbilityScore } from "./ability-score";
import type { DiceRoller } from "./dice-roller";

export interface AbilityCheckResult {
  readonly roll: number;
  readonly modifier: number;
  readonly total: number;
  readonly difficultyClass: number;
  readonly success: boolean;
}

/** Test de caractéristique SRD 5.1 : d20 + modificateur >= DD. */
export function resolveAbilityCheck(
  score: AbilityScore,
  difficultyClass: number,
  dice: DiceRoller,
): AbilityCheckResult {
  const roll = dice.roll(20);
  const total = roll + score.modifier;
  return { roll, modifier: score.modifier, total, difficultyClass, success: total >= difficultyClass };
}
