/** Les six caractéristiques SRD 5.1. */
export const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

export type Ability = (typeof ABILITIES)[number];

export function isAbility(value: unknown): value is Ability {
  return typeof value === "string" && (ABILITIES as readonly string[]).includes(value);
}
