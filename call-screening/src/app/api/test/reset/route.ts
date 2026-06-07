import { NextResponse } from "next/server";
import { getRepo } from "@/db";
import { MemoryRepo } from "@/db/memoryRepo";

export const dynamic = "force-dynamic";

/**
 * Endpoint de réinitialisation réservé aux tests E2E. Disponible uniquement quand
 * `ENABLE_TEST_ENDPOINTS=1` (jamais en production réelle).
 */
export async function POST() {
  if (process.env.ENABLE_TEST_ENDPOINTS !== "1") {
    return NextResponse.json({ error: "Indisponible" }, { status: 404 });
  }
  const repo = getRepo();
  if (repo instanceof MemoryRepo) {
    repo.reset();
    return NextResponse.json({ ok: true, repo: "memory" });
  }
  return NextResponse.json({ ok: false, repo: "pg" }, { status: 400 });
}
