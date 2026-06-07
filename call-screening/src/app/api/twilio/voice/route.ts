import { screenCall } from "@/app-core/screenCall";
import { decisionToTwiML } from "@/adapters/twilio";

export const dynamic = "force-dynamic";

/**
 * FR-7 — Webhook Twilio. Reçoit un POST form-encoded avec le champ `From`,
 * réutilise le même moteur de décision que l'endpoint générique, et répond en TwiML.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const from = String(form.get("From") ?? "");

  const decision = await screenCall(from);
  const xml = decisionToTwiML(decision);

  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}
