/** Les six caractéristiques SRD 5.1. */
export const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

export type Ability = (typeof ABILITIES)[number];

export function isAbility(value: unknown): value is Ability {
  return typeof value === "string" && (ABILITIES as readonly string[]).includes(value);
}

/** Construit un enregistrement complet des six caractéristiques (sans cast). */
export function mapAbilities<T>(fn: (ability: Ability) => T): Record<Ability, T> {
  return { STR: fn("STR"), DEX: fn("DEX"), CON: fn("CON"), INT: fn("INT"), WIS: fn("WIS"), CHA: fn("CHA") };
}
