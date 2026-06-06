import type { Decision, Prefix } from "./types";

/**
 * Évalue un numéro normalisé contre la liste noire de préfixes (FR-2, FR-3).
 *
 * - Bloque si le numéro commence par au moins un préfixe interdit.
 * - En cas de chevauchement, retient le préfixe le plus long (le plus spécifique).
 * - Un blocage produit l'action `VOICEMAIL` et marque `spam`.
 * - Un numéro invalide (`null`) n'est jamais bloqué (principe de prudence).
 *
 * @param normalized Numéro en E.164, ou `null` si l'entrée n'a pas pu être normalisée.
 * @param prefixes Liste des préfixes interdits actifs.
 */
export function decide(
  normalized: string | null,
  prefixes: readonly Prefix[],
): Decision {
  const allow = (): Decision => ({
    decision: "ALLOW",
    action: "RING",
    spam: false,
    matchedPrefix: null,
    normalized,
  });

  if (!normalized) return allow();

  let matched: string | null = null;
  for (const { value } of prefixes) {
    if (normalized.startsWith(value)) {
      if (matched === null || value.length > matched.length) {
        matched = value;
      }
    }
  }

  if (matched === null) return allow();

  return {
    decision: "BLOCK",
    action: "VOICEMAIL",
    spam: true,
    matchedPrefix: matched,
    normalized,
  };
}
