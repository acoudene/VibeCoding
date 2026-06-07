import { NextResponse } from "next/server";
import { getRepo } from "@/db";

export const dynamic = "force-dynamic";

/** FR-4 — Suppression d'un préfixe par identifiant. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const removed = await getRepo().removePrefix(id);
  if (!removed) {
    return NextResponse.json({ error: "Préfixe introuvable" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
