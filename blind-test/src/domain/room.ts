import type { ExpectedAnswer, MatchOutcome } from "./answer-matcher";
import { Player, type PlayerId } from "./player";
import type { Playlist } from "./playlist";
import { RoomCode } from "./room-code";
import { BuzzTooEarlyError, Round, type RoundOutcome, type RoundStatus } from "./round";

export { BuzzTooEarlyError, Round, type RoundOutcome, type RoundStatus };

export type RoomMode = "buzz" | "input";

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

export class RoomNotStartableError extends Error {
  constructor(status: RoomStatus) {
    super(`Room cannot be started in status "${status}"`);
    this.name = "RoomNotStartableError";
  }
}

export class CannotStartEmptyRoomError extends Error {
  constructor() {
    super("Cannot start a room with no players");
    this.name = "CannotStartEmptyRoomError";
  }
}

export class RoundNotResolvedError extends Error {
  constructor() {
    super("Cannot advance to the next track while the current round is not resolved");
    this.name = "RoundNotResolvedError";
  }
}

export class NoMoreTracksError extends Error {
  constructor() {
    super("No more tracks to play in this playlist");
    this.name = "NoMoreTracksError";
  }
}

export class GameNotInProgressError extends Error {
  constructor(status: RoomStatus) {
    super(`Game is not in progress (status "${status}")`);
    this.name = "GameNotInProgressError";
  }
}

export class RoundNotPlayingError extends Error {
  constructor(status: RoundStatus) {
    super(`Round is not accepting buzzes (status "${status}")`);
    this.name = "RoundNotPlayingError";
  }
}

export class BuzzAlreadyTakenError extends Error {
  constructor(currentBuzzer: PlayerId) {
    super(`Buzz already taken by "${currentBuzzer}"`);
    this.name = "BuzzAlreadyTakenError";
  }
}

export class PlayerBlockedError extends Error {
  constructor(playerId: PlayerId) {
    super(`Player "${playerId}" is blocked on this round`);
    this.name = "PlayerBlockedError";
  }
}

export class InvalidValidationError extends Error {
  constructor(outcome: RoundOutcome, status: RoundStatus) {
    super(`Cannot validate "${outcome}" on a round with status "${status}"`);
    this.name = "InvalidValidationError";
  }
}

export class InvalidModeChangeError extends Error {
  constructor(status: RoomStatus) {
    super(`Cannot change room mode while status is "${status}"`);
    this.name = "InvalidModeChangeError";
  }
}

export class WrongModeError extends Error {
  constructor(expected: RoomMode, actual: RoomMode) {
    super(`Operation requires room mode "${expected}", but room is in "${actual}"`);
    this.name = "WrongModeError";
  }
}

const MAX_PLAYERS = 8;

export type RoomStatus = "lobby" | "playing" | "finished";

export type Clock = { now: () => number };

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
  readonly mode: RoomMode;
  readonly players: ReadonlyArray<Player>;
  readonly rounds: ReadonlyArray<Round>;
  readonly createdAt: number;
  readonly resolvedOutcomes: ReadonlyArray<ReadonlyMap<PlayerId, MatchOutcome>>;

  private constructor(args: {
    code: string;
    hostId: PlayerId;
    playlist: Playlist;
    status: RoomStatus;
    mode: RoomMode;
    players: ReadonlyArray<Player>;
    rounds: ReadonlyArray<Round>;
    createdAt: number;
    resolvedOutcomes: ReadonlyArray<ReadonlyMap<PlayerId, MatchOutcome>>;
  }) {
    this.code = args.code;
    this.hostId = args.hostId;
    this.playlist = args.playlist;
    this.status = args.status;
    this.mode = args.mode;
    this.players = args.players;
    this.rounds = args.rounds;
    this.createdAt = args.createdAt;
    this.resolvedOutcomes = args.resolvedOutcomes;
  }

  static create(props: RoomCreateProps): Room {
    const code = RoomCode.normalize(props.code);
    return new Room({
      code,
      hostId: props.hostId,
      playlist: props.playlist,
      status: "lobby",
      mode: "buzz",
      players: [],
      rounds: [],
      createdAt: props.clock.now(),
      resolvedOutcomes: [],
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

  start(clock?: Clock): Room {
    if (this.status !== "lobby") throw new RoomNotStartableError(this.status);
    if (this.players.length === 0) throw new CannotStartEmptyRoomError();
    const startedAt = clock?.now() ?? 0;
    return this.cloneWith({ status: "playing", rounds: [Round.start(0, startedAt)] });
  }

  buzz(props: { playerId: PlayerId; at: number }): Room {
    if (this.status !== "playing") throw new GameNotInProgressError(this.status);
    if (!this.players.some((p) => p.id === props.playerId)) {
      throw new PlayerNotInRoomError(props.playerId);
    }
    const current = this.rounds[this.rounds.length - 1];
    if (!current) throw new GameNotInProgressError(this.status);
    if (current.status === "buzzed") {
      throw new BuzzAlreadyTakenError(current.currentBuzzer ?? "");
    }
    if (current.status !== "playing") throw new RoundNotPlayingError(current.status);
    if (current.isPlayerBlocked(props.playerId)) throw new PlayerBlockedError(props.playerId);
    const updated = current.markBuzzed(props.playerId, props.at);
    return this.cloneWith({ rounds: [...this.rounds.slice(0, -1), updated] });
  }

  validate(outcome: RoundOutcome): Room {
    if (this.status !== "playing") throw new GameNotInProgressError(this.status);
    const current = this.rounds[this.rounds.length - 1];
    if (!current) throw new GameNotInProgressError(this.status);

    if (outcome === "skip") {
      if (current.status === "resolved") throw new InvalidValidationError(outcome, current.status);
      const resolved = current.markResolved("skip");
      return this.cloneWith({ rounds: [...this.rounds.slice(0, -1), resolved] });
    }

    if (current.status !== "buzzed") {
      throw new InvalidValidationError(outcome, current.status);
    }

    if (outcome === "correct" || outcome === "half") {
      const points = outcome === "correct" ? 1 : 0.5;
      const buzzerId = current.currentBuzzer!;
      const players = this.players.map((p) => (p.id === buzzerId ? p.addPoints(points) : p));
      const resolved = current.markResolved(outcome);
      return this.cloneWith({
        players,
        rounds: [...this.rounds.slice(0, -1), resolved],
      });
    }

    // wrong: block buzzer, return to playing; if all players are now blocked,
    // resolve the round without a winner.
    const blocked = current.block();
    const allBlocked = this.players.every((p) => blocked.blockedPlayerIds.has(p.id));
    const next = allBlocked ? blocked.markResolved("wrong") : blocked;
    return this.cloneWith({ rounds: [...this.rounds.slice(0, -1), next] });
  }

  markCurrentRoundStarted(at: number): Room {
    if (this.status !== "playing") throw new GameNotInProgressError(this.status);
    const current = this.rounds[this.rounds.length - 1];
    if (!current) throw new GameNotInProgressError(this.status);
    if (current.status !== "playing") throw new RoundNotPlayingError(current.status);
    const refreshed = Round.restart(current, at);
    return this.cloneWith({ rounds: [...this.rounds.slice(0, -1), refreshed] });
  }

  playNextTrack(clock?: Clock): Room {
    if (this.status === "finished") throw new NoMoreTracksError();
    if (this.status !== "playing") throw new GameNotInProgressError(this.status);
    const current = this.rounds[this.rounds.length - 1];
    if (!current || current.status !== "resolved") throw new RoundNotResolvedError();
    const nextIndex = current.trackIndex + 1;
    if (nextIndex >= this.playlist.length) {
      return this.cloneWith({ status: "finished" });
    }
    const startedAt = clock?.now() ?? 0;
    return this.cloneWith({ rounds: [...this.rounds, Round.start(nextIndex, startedAt)] });
  }

  leaderboard(): ReadonlyArray<{ playerId: PlayerId; nickname: string; score: number }> {
    return this.players
      .map((p) => ({ playerId: p.id, nickname: p.nickname, score: p.score }))
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return a.nickname.localeCompare(b.nickname);
      });
  }

  setMode(mode: RoomMode): Room {
    if (this.status !== "lobby") throw new InvalidModeChangeError(this.status);
    return this.cloneWith({ mode });
  }

  submitAnswer(props: {
    playerId: PlayerId;
    submission: { title?: string; artist?: string };
    at: number;
  }): Room {
    if (this.mode !== "input") throw new WrongModeError("input", this.mode);
    if (this.status !== "playing") throw new GameNotInProgressError(this.status);
    if (!this.players.some((p) => p.id === props.playerId)) {
      throw new PlayerNotInRoomError(props.playerId);
    }
    const current = this.rounds[this.rounds.length - 1];
    if (!current) throw new GameNotInProgressError(this.status);
    if (current.status !== "playing") throw new RoundNotPlayingError(current.status);
    const updated = current.submitAnswer(props.playerId, props.submission, props.at);
    return this.cloneWith({ rounds: [...this.rounds.slice(0, -1), updated] });
  }

  allActivePlayersSubmitted(): boolean {
    if (this.players.length === 0) return false;
    const current = this.rounds[this.rounds.length - 1];
    if (!current) return false;
    return this.players.every((p) => current.submissionOf(p.id) !== undefined);
  }

  resolveInputRound(): Room {
    if (this.mode !== "input") throw new WrongModeError("input", this.mode);
    if (this.status !== "playing") throw new GameNotInProgressError(this.status);
    const current = this.rounds[this.rounds.length - 1];
    if (!current) throw new GameNotInProgressError(this.status);
    if (current.status !== "playing") throw new RoundNotPlayingError(current.status);
    const expected = this.expectedAnswerForRound(current);
    const playerIds = this.players.map((p) => p.id);
    const outcomes = current.resolveByInput(expected, playerIds);
    const updatedPlayers = this.players.map((p) => {
      const outcome = outcomes.get(p.id);
      const points = pointsForOutcome(outcome);
      return points > 0 ? p.addPoints(points) : p;
    });
    const resolved = current.markResolvedByInput();
    return this.cloneWith({
      players: updatedPlayers,
      rounds: [...this.rounds.slice(0, -1), resolved],
      resolvedOutcomes: [...this.resolvedOutcomes, outcomes],
    });
  }

  overrideOutcome(props: { playerId: PlayerId; outcome: MatchOutcome }): Room {
    if (this.mode !== "input") throw new WrongModeError("input", this.mode);
    if (!this.players.some((p) => p.id === props.playerId)) {
      throw new PlayerNotInRoomError(props.playerId);
    }
    const lastIndex = this.resolvedOutcomes.length - 1;
    if (lastIndex < 0) throw new RoundNotResolvedError();
    const lastRound = this.rounds[this.rounds.length - 1];
    if (!lastRound || lastRound.status !== "resolved") throw new RoundNotResolvedError();
    const lastOutcomes = this.resolvedOutcomes[lastIndex]!;
    const previousOutcome = lastOutcomes.get(props.playerId) ?? "wrong";
    if (previousOutcome === props.outcome) return this;
    const delta = pointsForOutcome(props.outcome) - pointsForOutcome(previousOutcome);
    const updatedPlayers = this.players.map((p) =>
      p.id === props.playerId && delta !== 0 ? p.setScore(p.score + delta) : p,
    );
    const updatedOutcomes = new Map(lastOutcomes);
    updatedOutcomes.set(props.playerId, props.outcome);
    const updatedHistory = [...this.resolvedOutcomes];
    updatedHistory[lastIndex] = updatedOutcomes;
    return this.cloneWith({ players: updatedPlayers, resolvedOutcomes: updatedHistory });
  }

  private expectedAnswerForRound(round: Round): ExpectedAnswer {
    const track = this.playlist.tracks[round.trackIndex];
    if (!track) {
      throw new GameNotInProgressError(this.status);
    }
    return { expectedTitle: track.expectedTitle, expectedArtist: track.expectedArtist };
  }

  private cloneWith(patch: Partial<RoomInternalState>): Room {
    return new Room({
      code: this.code,
      hostId: this.hostId,
      playlist: this.playlist,
      status: this.status,
      mode: this.mode,
      players: this.players,
      rounds: this.rounds,
      createdAt: this.createdAt,
      resolvedOutcomes: this.resolvedOutcomes,
      ...patch,
    });
  }
}

function pointsForOutcome(outcome: MatchOutcome | undefined): number {
  if (outcome === "correct") return 1;
  if (outcome === "half") return 0.5;
  return 0;
}

type RoomInternalState = {
  code: string;
  hostId: PlayerId;
  playlist: Playlist;
  status: RoomStatus;
  mode: RoomMode;
  players: ReadonlyArray<Player>;
  rounds: ReadonlyArray<Round>;
  createdAt: number;
  resolvedOutcomes: ReadonlyArray<ReadonlyMap<PlayerId, MatchOutcome>>;
};
