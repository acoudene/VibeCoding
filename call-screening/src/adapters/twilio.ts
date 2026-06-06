import type { Decision } from "@/domain/types";

const HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

/**
 * Traduit une décision en TwiML (FR-7).
 *
 * - BLOCK → message poli puis renvoi en messagerie (Redirect) avec raccrochage de
 *   repli ; l'appel est ainsi écarté de la sonnerie et orienté voicemail.
 * - ALLOW → laisse sonner (réponse neutre, pas de rejet).
 *
 * Le numéro de messagerie réel est branché via la variable d'environnement
 * `VOICEMAIL_URL` ; à défaut on raccroche poliment après l'annonce.
 */
export function decisionToTwiML(
  decision: Decision,
  opts: { voicemailUrl?: string | null } = {},
): string {
  if (decision.decision === "BLOCK") {
    const voicemailUrl = opts.voicemailUrl ?? process.env.VOICEMAIL_URL ?? null;
    const tail = voicemailUrl
      ? `<Redirect>${escapeXml(voicemailUrl)}</Redirect>`
      : `<Hangup/>`;
    return [
      HEADER,
      "<Response>",
      "<Say>Cet appel est identifié comme indésirable et redirigé vers la messagerie.</Say>",
      tail,
      "</Response>",
    ].join("");
  }

  // ALLOW : réponse neutre, l'appel continue / sonne.
  return [HEADER, "<Response></Response>"].join("");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
