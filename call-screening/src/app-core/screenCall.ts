import { getRepo } from "@/db";
import { normalizePhoneNumber } from "@/domain/normalize";
import { decide } from "@/domain/decision";
import type { Decision } from "@/domain/types";

/**
 * Service applicatif central : évalue un appel entrant de bout en bout.
 *
 * 1. normalise le numéro (FR-1) ;
 * 2. charge les préfixes interdits actifs ;
 * 3. rend une décision (FR-2, FR-3) ;
 * 4. journalise systématiquement l'évaluation (FR-5) ;
 * 5. retourne la décision.
 *
 * @param rawNumber Numéro brut tel que reçu (du webhook ou de Twilio).
 */
export async function screenCall(rawNumber: string): Promise<Decision> {
  const repo = getRepo();
  const defaultCountryCode = process.env.DEFAULT_COUNTRY_CODE ?? "+33";

  const normalized = normalizePhoneNumber(rawNumber ?? "", defaultCountryCode);
  const prefixes = await repo.listPrefixes();
  const decision = decide(normalized, prefixes);

  await repo.insertLog({
    rawNumber: rawNumber ?? "",
    normalized: decision.normalized,
    decision: decision.decision,
    action: decision.action,
    matchedPrefix: decision.matchedPrefix,
    spam: decision.spam,
  });

  return decision;
}
