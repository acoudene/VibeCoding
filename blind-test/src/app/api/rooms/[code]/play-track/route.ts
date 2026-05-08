import { NextResponse } from "next/server";

import { getContainer } from "../../../_di";
import { errorToResponse } from "../../../_errors";

type PlayBody = { hostId: string; trackIndex: number };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  try {
    const { code } = await params;
    const body = (await request.json()) as PlayBody;
    if (!body?.hostId || typeof body.trackIndex !== "number") {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }
    await getContainer().playTrack.execute({
      code,
      hostId: body.hostId,
      trackIndex: body.trackIndex,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorToResponse(err);
  }
}
