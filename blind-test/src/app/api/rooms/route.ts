import { NextResponse } from "next/server";

import { getContainer } from "../_di";
import { errorToResponse } from "../_errors";
import { type PlaylistDto, playlistFromDto } from "../_playlist-dto";

type CreateRoomBody = {
  hostId: string;
  playlist: PlaylistDto;
};

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as CreateRoomBody;
    if (!body?.hostId || !body?.playlist) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }
    const playlist = playlistFromDto(body.playlist);
    const result = await getContainer().createRoom.execute({ hostId: body.hostId, playlist });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return errorToResponse(err);
  }
}
