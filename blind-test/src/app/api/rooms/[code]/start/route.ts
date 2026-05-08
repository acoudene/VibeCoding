import { NextResponse } from "next/server";

import { getContainer } from "../../../_di";
import { errorToResponse } from "../../../_errors";

type StartBody = { hostId: string };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  try {
    const { code } = await params;
    const body = (await request.json()) as StartBody;
    if (!body?.hostId) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }
    await getContainer().startGame.execute({ code, hostId: body.hostId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorToResponse(err);
  }
}
