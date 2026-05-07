import type { Player, PlayerId } from "./player";
import type { Playlist } from "./playlist";
import { RoomCode } from "./room-code";

export type RoomStatus = "lobby" | "playing" | "finished";

export type Clock = { now: () => number };

export type RoundStatus = "playing" | "buzzed" | "resolved";
export type RoundOutcome = "correct" | "wrong" | "half" | "skip";

export type Round = {
  trackIndex: number;
  status: RoundStatus;
  currentBuzzer?: PlayerId;
  blockedPlayerIds: ReadonlySet<PlayerId>;
  outcome?: RoundOutcome;
};

export type RoomCreateProps = {
  code: string;
  hostId: PlayerId;
  playlist: Playlist;
  clock: Clock;
};

export class Room {
  readonly code: string;
  readonly hostId: PlayerId;
  readonly playlist: Playlist;
  readonly status: RoomStatus;
  readonly players: ReadonlyArray<Player>;
  readonly rounds: ReadonlyArray<Round>;
  readonly createdAt: number;

  private constructor(args: {
    code: string;
    hostId: PlayerId;
    playlist: Playlist;
    status: RoomStatus;
    players: ReadonlyArray<Player>;
    rounds: ReadonlyArray<Round>;
    createdAt: number;
  }) {
    this.code = args.code;
    this.hostId = args.hostId;
    this.playlist = args.playlist;
    this.status = args.status;
    this.players = args.players;
    this.rounds = args.rounds;
    this.createdAt = args.createdAt;
  }

  static create(props: RoomCreateProps): Room {
    const code = RoomCode.normalize(props.code);
    return new Room({
      code,
      hostId: props.hostId,
      playlist: props.playlist,
      status: "lobby",
      players: [],
      rounds: [],
      createdAt: props.clock.now(),
    });
  }
}
