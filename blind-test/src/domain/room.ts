import { Player, type PlayerId } from "./player";
import type { Playlist } from "./playlist";
import { RoomCode } from "./room-code";

export class RoomNotJoinableError extends Error {
  constructor(status: RoomStatus) {
    super(`Room is not joinable in status "${status}"`);
    this.name = "RoomNotJoinableError";
  }
}

export class RoomFullError extends Error {
  constructor() {
    super("Room is full (max 8 players)");
    this.name = "RoomFullError";
  }
}

export class DuplicateNicknameError extends Error {
  constructor(nickname: string) {
    super(`Nickname "${nickname}" is already taken in this room`);
    this.name = "DuplicateNicknameError";
  }
}

export class HostCannotJoinError extends Error {
  constructor() {
    super("The host cannot join the room as a player");
    this.name = "HostCannotJoinError";
  }
}

export class PlayerNotInRoomError extends Error {
  constructor(playerId: PlayerId) {
    super(`Player "${playerId}" is not in this room`);
    this.name = "PlayerNotInRoomError";
  }
}

export class NicknameMismatchError extends Error {
  constructor(expected: string, got: string) {
    super(`Nickname mismatch on reconnect: expected "${expected}", got "${got}"`);
    this.name = "NicknameMismatchError";
  }
}

const MAX_PLAYERS = 8;

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

  join(props: { playerId: PlayerId; nickname: string }): Room {
    if (this.status !== "lobby") throw new RoomNotJoinableError(this.status);
    if (props.playerId === this.hostId) throw new HostCannotJoinError();
    if (this.players.length >= MAX_PLAYERS) throw new RoomFullError();
    const lower = props.nickname.toLowerCase();
    if (this.players.some((p) => p.nickname.toLowerCase() === lower)) {
      throw new DuplicateNicknameError(props.nickname);
    }
    const newPlayer = Player.create({ id: props.playerId, nickname: props.nickname });
    return this.cloneWith({ players: [...this.players, newPlayer] });
  }

  leave(playerId: PlayerId): Room {
    const idx = this.players.findIndex((p) => p.id === playerId);
    if (idx === -1) throw new PlayerNotInRoomError(playerId);
    const next = [...this.players];
    next[idx] = this.players[idx]!.setConnected(false);
    return this.cloneWith({ players: next });
  }

  reconnect(props: { playerId: PlayerId; nickname: string }): Room {
    const idx = this.players.findIndex((p) => p.id === props.playerId);
    if (idx === -1) throw new PlayerNotInRoomError(props.playerId);
    const existing = this.players[idx]!;
    if (existing.nickname.toLowerCase() !== props.nickname.toLowerCase()) {
      throw new NicknameMismatchError(existing.nickname, props.nickname);
    }
    const next = [...this.players];
    next[idx] = existing.setConnected(true);
    return this.cloneWith({ players: next });
  }

  private cloneWith(patch: Partial<RoomInternalState>): Room {
    return new Room({
      code: this.code,
      hostId: this.hostId,
      playlist: this.playlist,
      status: this.status,
      players: this.players,
      rounds: this.rounds,
      createdAt: this.createdAt,
      ...patch,
    });
  }
}

type RoomInternalState = {
  code: string;
  hostId: PlayerId;
  playlist: Playlist;
  status: RoomStatus;
  players: ReadonlyArray<Player>;
  rounds: ReadonlyArray<Round>;
  createdAt: number;
};
