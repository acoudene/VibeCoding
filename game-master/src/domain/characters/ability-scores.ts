import { ABILITIES, mapAbilities, type Ability } from "../rules/ability";
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
    return new AbilityScores(mapAbilities((a) => AbilityScore.of(assignment[a])));
  }

  get(ability: Ability): AbilityScore {
    return this.scores[ability];
  }

  toValues(): Record<Ability, number> {
    return mapAbilities((a) => this.scores[a].value);
  }

  equals(other: AbilityScores): boolean {
    return ABILITIES.every((a) => this.scores[a].value === other.scores[a].value);
  }
}
