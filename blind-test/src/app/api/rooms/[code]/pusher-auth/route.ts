import { NextResponse } from "next/server";

import { getContainer } from "../../../_di";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  const { code } = await params;
  const formData = await request.formData();
  const socketId = String(formData.get("socket_id") ?? "");
  const channelName = String(formData.get("channel_name") ?? "");
  const playerId = String(formData.get("playerId") ?? "");
  const nickname = String(formData.get("nickname") ?? playerId);

  if (!socketId || !channelName || !playerId) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  if (!channelName.endsWith(code)) {
    return NextResponse.json({ error: "channel mismatch" }, { status: 403 });
  }

  if (channelName.startsWith("private-host-")) {
    const room = await getContainer().rooms.find(code);
    if (room === null) {
      return NextResponse.json({ error: "room not found" }, { status: 404 });
    }
    if (room.hostId !== playerId) {
      return NextResponse.json({ error: "host only" }, { status: 403 });
    }
    const auth = await getContainer().channel.authorizePrivate({ socketId, channelName });
    return NextResponse.json(auth);
  }

  const auth = await getContainer().channel.authorizePresence({
    socketId,
    channelName,
    user: { id: playerId, info: { nickname } },
  });

  return NextResponse.json(auth);
}
