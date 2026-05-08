import { NextResponse } from "next/server";

import type { RoundOutcome } from "@/domain/round";

import { getContainer } from "../../../_di";
import { errorToResponse } from "../../../_errors";

type ValidateBody = { hostId: string; outcome: RoundOutcome };
const ALLOWED: RoundOutcome[] = ["correct", "wrong", "half", "skip"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  try {
    const { code } = await params;
    const body = (await request.json()) as ValidateBody;
    if (!body?.hostId || !ALLOWED.includes(body.outcome)) {
      return NextResponse.json({ error: "missing or invalid fields" }, { status: 400 });
    }
    await getContainer().validateAnswer.execute({
      code,
      hostId: body.hostId,
      outcome: body.outcome,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorToResponse(err);
  }
}
