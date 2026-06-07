import { NextResponse } from "next/server";
import { getRepo, DuplicatePrefixError } from "@/db";
import { normalizePrefixValue, InvalidPrefixError } from "@/app-core/prefixInput";

export const dynamic = "force-dynamic";

/** FR-4 — Liste des préfixes interdits. */
export async function GET() {
  const prefixes = await getRepo().listPrefixes();
  return NextResponse.json(prefixes);
}

/** FR-4 — Ajout d'un préfixe (normalisé, validé, dédupliqué). */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const rawValue =
    typeof body === "object" && body !== null && "value" in body
      ? String((body as { value: unknown }).value ?? "")
      : "";
  const label =
    typeof body === "object" && body !== null && "label" in body
      ? String((body as { label: unknown }).label ?? "")
      : null;

  let value: string;
  try {
    value = normalizePrefixValue(rawValue, process.env.DEFAULT_COUNTRY_CODE ?? "+33");
  } catch (err) {
    if (err instanceof InvalidPrefixError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  try {
    const prefix = await getRepo().addPrefix(value, label || null);
    return NextResponse.json(prefix, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicatePrefixError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
