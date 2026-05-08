import type { PlayerId } from "./player";

export type RoundStatus = "playing" | "buzzed" | "resolved";
export type RoundOutcome = "correct" | "wrong" | "half" | "skip";

export const BUZZ_GRACE_MS = 500;

export class InvalidRoundTransitionError extends Error {
  constructor(from: RoundStatus, action: string) {
    super(`Invalid round transition: cannot ${action} from status "${from}"`);
    this.name = "InvalidRoundTransitionError";
  }
}

export class PlayerAlreadyBlockedError extends Error {
  constructor(playerId: PlayerId) {
    super(`Player "${playerId}" is already blocked on this round`);
    this.name = "PlayerAlreadyBlockedError";
  }
}

export class BuzzTooEarlyError extends Error {
  constructor(remainingMs: number) {
    super(`Buzz received during the ${BUZZ_GRACE_MS}ms grace period (${remainingMs}ms remaining)`);
    this.name = "BuzzTooEarlyError";
  }
}

export class Round {
  readonly trackIndex: number;
  readonly status: RoundStatus;
  readonly startedAt: number;
  readonly currentBuzzer?: PlayerId;
  readonly buzzedAt?: number;
  readonly blockedPlayerIds: ReadonlySet<PlayerId>;
  readonly outcome?: RoundOutcome;

  private constructor(args: {
    trackIndex: number;
    status: RoundStatus;
    startedAt: number;
    currentBuzzer?: PlayerId;
    buzzedAt?: number;
    blockedPlayerIds: ReadonlySet<PlayerId>;
    outcome?: RoundOutcome;
  }) {
    this.trackIndex = args.trackIndex;
    this.status = args.status;
    this.startedAt = args.startedAt;
    this.currentBuzzer = args.currentBuzzer;
    this.buzzedAt = args.buzzedAt;
    this.blockedPlayerIds = args.blockedPlayerIds;
    this.outcome = args.outcome;
  }

  static start(trackIndex: number, startedAt: number = 0): Round {
    return new Round({
      trackIndex,
      status: "playing",
      startedAt,
      blockedPlayerIds: new Set(),
    });
  }

  static restart(previous: Round, startedAt: number): Round {
    return new Round({
      trackIndex: previous.trackIndex,
      status: "playing",
      startedAt,
      blockedPlayerIds: previous.blockedPlayerIds,
    });
  }

  isPlayerBlocked(playerId: PlayerId): boolean {
    return this.blockedPlayerIds.has(playerId);
  }

  markBuzzed(playerId: PlayerId, at?: number): Round {
    if (this.status !== "playing") throw new InvalidRoundTransitionError(this.status, "buzz");
    if (this.blockedPlayerIds.has(playerId)) throw new PlayerAlreadyBlockedError(playerId);
    if (at !== undefined) {
      const elapsed = at - this.startedAt;
      if (elapsed < BUZZ_GRACE_MS) {
        throw new BuzzTooEarlyError(BUZZ_GRACE_MS - elapsed);
      }
    }
    return new Round({
      trackIndex: this.trackIndex,
      status: "buzzed",
      startedAt: this.startedAt,
      currentBuzzer: playerId,
      buzzedAt: at,
      blockedPlayerIds: this.blockedPlayerIds,
    });
  }

  markResolved(outcome: RoundOutcome): Round {
    const allowedFromPlaying = outcome === "skip" || outcome === "wrong";
    if (this.status === "playing" && !allowedFromPlaying) {
      throw new InvalidRoundTransitionError(this.status, `resolve as "${outcome}"`);
    }
    if (this.status !== "playing" && this.status !== "buzzed") {
      throw new InvalidRoundTransitionError(this.status, `resolve as "${outcome}"`);
    }
    return new Round({
      trackIndex: this.trackIndex,
      status: "resolved",
      startedAt: this.startedAt,
      currentBuzzer: this.currentBuzzer,
      buzzedAt: this.buzzedAt,
      blockedPlayerIds: this.blockedPlayerIds,
      outcome,
    });
  }

  block(): Round {
    if (this.status !== "buzzed" || this.currentBuzzer === undefined) {
      throw new InvalidRoundTransitionError(this.status, "block buzzer");
    }
    const nextBlocked = new Set(this.blockedPlayerIds);
    nextBlocked.add(this.currentBuzzer);
    return new Round({
      trackIndex: this.trackIndex,
      status: "playing",
      startedAt: this.startedAt,
      blockedPlayerIds: nextBlocked,
    });
  }
}
