import { NextResponse } from "next/server";

import { getContainer } from "../../../_di";
import { errorToResponse } from "../../../_errors";

type BuzzBody = { playerId: string };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  try {
    const { code } = await params;
    const body = (await request.json()) as BuzzBody;
    if (!body?.playerId) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }
    await getContainer().buzz.execute({ code, playerId: body.playerId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorToResponse(err);
  }
}
