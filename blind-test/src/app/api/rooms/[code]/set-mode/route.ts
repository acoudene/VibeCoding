import { NextResponse } from "next/server";

import type { RoomMode } from "@/domain/room";

import { getContainer } from "../../../_di";
import { errorToResponse } from "../../../_errors";

type Body = { hostId: string; mode: RoomMode };
const ALLOWED: RoomMode[] = ["buzz", "input"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  try {
    const { code } = await params;
    const body = (await request.json()) as Body;
    if (!body?.hostId || !ALLOWED.includes(body.mode)) {
      return NextResponse.json({ error: "missing or invalid fields" }, { status: 400 });
    }
    await getContainer().setRoomMode.execute({
      code,
      hostId: body.hostId,
      mode: body.mode,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorToResponse(err);
  }
}
