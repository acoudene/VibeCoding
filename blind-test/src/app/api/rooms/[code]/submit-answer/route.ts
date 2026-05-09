import { NextResponse } from "next/server";

import { getContainer } from "../../../_di";
import { errorToResponse } from "../../../_errors";

type Body = { playerId: string; title?: string; artist?: string };
const MAX_FIELD_LENGTH = 100;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  try {
    const { code } = await params;
    const body = (await request.json()) as Body;
    if (!body?.playerId) {
      return NextResponse.json({ error: "missing playerId" }, { status: 400 });
    }
    const title = typeof body.title === "string" ? body.title : undefined;
    const artist = typeof body.artist === "string" ? body.artist : undefined;
    if ((title?.length ?? 0) > MAX_FIELD_LENGTH || (artist?.length ?? 0) > MAX_FIELD_LENGTH) {
      return NextResponse.json({ error: "field too long" }, { status: 400 });
    }
    await getContainer().submitAnswer.execute({
      code,
      playerId: body.playerId,
      submission: { title, artist },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorToResponse(err);
  }
}
