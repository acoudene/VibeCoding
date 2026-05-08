import { NextResponse } from "next/server";

import { getContainer } from "../../../_di";
import { errorToResponse } from "../../../_errors";

type JoinBody = { playerId: string; nickname: string };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  try {
    const { code } = await params;
    const body = (await request.json()) as JoinBody;
    if (!body?.playerId || !body?.nickname) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }
    await getContainer().joinRoom.execute({
      code,
      playerId: body.playerId,
      nickname: body.nickname,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorToResponse(err);
  }
}
