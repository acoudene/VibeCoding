import { ABILITIES, type Ability } from "../rules/ability";
import { AbilityScore } from "../rules/ability-score";

/** Tableau standard : chaque valeur est attribuée exactement une fois. */
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

export class InvalidAbilityAssignmentError extends Error {
  constructor() {
    super(`Ability scores must be a distribution of the standard array ${STANDARD_ARRAY.join(", ")}`);
  }
}

/** Objet-valeur immuable : les six caractéristiques d'un personnage. */
export class AbilityScores {
  private constructor(private readonly scores: Readonly<Record<Ability, AbilityScore>>) {}

  static fromStandardArray(assignment: Readonly<Record<Ability, number>>): AbilityScores {
    const values = ABILITIES.map((a) => assignment[a]).sort((x, y) => y - x);
    if (values.length !== STANDARD_ARRAY.length || values.some((v, i) => v !== STANDARD_ARRAY[i])) {
      throw new InvalidAbilityAssignmentError();
    }
    const scores = Object.fromEntries(ABILITIES.map((a) => [a, AbilityScore.of(assignment[a])])) as Record<
      Ability,
      AbilityScore
    >;
    return new AbilityScores(scores);
  }

  get(ability: Ability): AbilityScore {
    return this.scores[ability];
  }

  toValues(): Record<Ability, number> {
    return Object.fromEntries(ABILITIES.map((a) => [a, this.scores[a].value])) as Record<Ability, number>;
  }
}
