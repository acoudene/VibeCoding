import { NextResponse } from "next/server";

import type { MatchOutcome } from "@/domain/answer-matcher";

import { getContainer } from "../../../_di";
import { errorToResponse } from "../../../_errors";

type Body = { hostId: string; playerId: string; outcome: MatchOutcome };
const ALLOWED: MatchOutcome[] = ["correct", "half", "wrong"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  try {
    const { code } = await params;
    const body = (await request.json()) as Body;
    if (!body?.hostId || !body?.playerId || !ALLOWED.includes(body.outcome)) {
      return NextResponse.json({ error: "missing or invalid fields" }, { status: 400 });
    }
    await getContainer().overrideAnswerOutcome.execute({
      code,
      hostId: body.hostId,
      playerId: body.playerId,
      outcome: body.outcome,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorToResponse(err);
  }
}
