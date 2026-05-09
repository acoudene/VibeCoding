import { NextResponse } from "next/server";

import { getContainer } from "../../../_di";
import { errorToResponse } from "../../../_errors";

type Body = { authorId: string; text: string };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  try {
    const { code } = await params;
    const body = (await request.json()) as Body;
    if (!body?.authorId || typeof body.text !== "string") {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }
    await getContainer().postChatMessage.execute({
      code,
      authorId: body.authorId,
      text: body.text,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorToResponse(err);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  try {
    const { code } = await params;
    const chat = await getContainer().chats.find(code);
    return NextResponse.json({
      isOpen: chat?.isOpen ?? true,
      messages: chat?.messages ?? [],
    });
  } catch (err) {
    return errorToResponse(err);
  }
}
