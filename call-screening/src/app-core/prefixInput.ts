import { normalizePhoneNumber } from "@/domain/normalize";

/** Erreur de validation d'un préfixe saisi. */
export class InvalidPrefixError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPrefixError";
  }
}

/**
 * Normalise et valide un préfixe saisi par l'administrateur (FR-4).
 * - normalise en E.164 (réutilise la logique des numéros) ;
 * - exige `+` suivi de chiffres, longueur ≥ 2.
 */
export function normalizePrefixValue(raw: string, defaultCountryCode = "+33"): string {
  const normalized = normalizePhoneNumber(raw ?? "", defaultCountryCode);
  if (!normalized || !/^\+\d+$/.test(normalized) || normalized.length < 2) {
    throw new InvalidPrefixError(
      "Préfixe invalide : attendu '+' suivi de chiffres (ex. +33899).",
    );
  }
  return normalized;
}
