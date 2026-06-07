import { NextResponse } from "next/server";
import { screenCall } from "@/app-core/screenCall";

export const dynamic = "force-dynamic";

/**
 * FR-6 — Endpoint d'appel entrant (cœur générique).
 * Corps : `{ from: string }`. Retourne la décision et journalise l'appel.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const from =
    typeof body === "object" && body !== null && "from" in body
      ? String((body as { from: unknown }).from ?? "")
      : "";

  if (!from) {
    return NextResponse.json(
      { error: "Champ 'from' requis" },
      { status: 400 },
    );
  }

  const decision = await screenCall(from);
  return NextResponse.json(decision);
}
