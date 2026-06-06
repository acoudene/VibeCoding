/**
 * Normalise un numéro de téléphone brut en E.164 (FR-1).
 *
 * Règles :
 *  - retire les séparateurs (espaces, tirets, points, parenthèses, etc.) ;
 *  - `00XXXX...` (préfixe d'appel international) devient `+XXXX...` ;
 *  - un numéro national commençant par `0` est préfixé par l'indicatif pays par défaut ;
 *  - un numéro déjà en `+...` est conservé (après nettoyage) ;
 *  - une entrée vide ou non numérique retourne `null`.
 *
 * @param raw Numéro brut tel que reçu du fournisseur.
 * @param defaultCountryCode Indicatif pays par défaut au format `+33`.
 * @returns Le numéro en E.164, ou `null` si l'entrée est invalide.
 */
export function normalizePhoneNumber(
  raw: string,
  defaultCountryCode = "+33",
): string | null {
  if (raw == null) return null;

  // Conserve uniquement chiffres et un éventuel '+'.
  const hasPlus = raw.trim().startsWith("+");
  let digits = raw.replace(/[^\d]/g, "");

  // `00` international -> `+`
  if (!hasPlus && digits.startsWith("00")) {
    digits = digits.slice(2);
    return digits.length >= 2 ? `+${digits}` : null;
  }

  if (hasPlus) {
    return digits.length >= 2 ? `+${digits}` : null;
  }

  // Numéro national commençant par 0 -> indicatif pays + reste.
  if (digits.startsWith("0")) {
    const national = digits.slice(1);
    return national.length >= 1 ? `${defaultCountryCode}${national}` : null;
  }

  // Suite de chiffres sans contexte : on suppose déjà un format international.
  return digits.length >= 2 ? `+${digits}` : null;
}
