import "server-only";

import { NextResponse } from "next/server";

import { RoomNotFoundError } from "@/application/use-cases/join-room";
import { NotHostError } from "@/application/use-cases/start-game";

const STATUS_BY_NAME: Record<string, number> = {
  // 400 - bad request / domain invariants the client violated
  EmptyNicknameError: 400,
  NicknameTooLongError: 400,
  EmptyTrackFieldError: 400,
  InvalidYoutubeIdError: 400,
  InvalidStartSecondsError: 400,
  EmptyPlaylistNameError: 400,
  EmptyPlaylistError: 400,
  InvalidScoreError: 400,
  InvalidRoomCodeError: 400,
  InvalidValidationError: 400,
  CannotStartEmptyRoomError: 400,
  RoomCodeCollisionError: 500,

  // 403 - forbidden / not authorized
  HostCannotJoinError: 403,
  NotHostError: 403,
  PlayerBlockedError: 403,
  PlayerAlreadyBlockedError: 403,

  // 404 - not found
  RoomNotFoundError: 404,
  PlayerNotInRoomError: 404,

  // 409 - conflict / state mismatch
  RoomNotJoinableError: 409,
  RoomNotStartableError: 409,
  RoomFullError: 409,
  DuplicateNicknameError: 409,
  NicknameMismatchError: 409,
  RoundNotPlayingError: 409,
  RoundNotResolvedError: 409,
  BuzzAlreadyTakenError: 409,
  GameNotInProgressError: 409,
  NoMoreTracksError: 409,
  InvalidRoundTransitionError: 409,
  TrackIndexMismatchError: 409,
};

export function errorToResponse(err: unknown): NextResponse {
  if (err instanceof Error) {
    const status = STATUS_BY_NAME[err.name] ?? 500;
    return NextResponse.json({ error: err.name, message: err.message }, { status });
  }
  return NextResponse.json({ error: "Unknown", message: String(err) }, { status: 500 });
}

// Re-exported so route handlers can do `instanceof` checks if needed.
export { NotHostError, RoomNotFoundError };
