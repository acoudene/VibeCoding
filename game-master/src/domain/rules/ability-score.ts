/** Caractéristique SRD 5.1 : valeur 1..30, modificateur = floor((valeur - 10) / 2). */
export class AbilityScore {
  private constructor(readonly value: number) {}

  static of(value: number): AbilityScore {
    if (!Number.isInteger(value) || value < 1 || value > 30) {
      throw new RangeError(`AbilityScore must be an integer in [1, 30], got ${value}`);
    }
    return new AbilityScore(value);
  }

  get modifier(): number {
    return Math.floor((this.value - 10) / 2);
  }
}
