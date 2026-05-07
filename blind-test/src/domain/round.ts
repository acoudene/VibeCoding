import type { PlayerId } from "./player";

export type RoundStatus = "playing" | "buzzed" | "resolved";
export type RoundOutcome = "correct" | "wrong" | "half" | "skip";

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

export class Round {
  readonly trackIndex: number;
  readonly status: RoundStatus;
  readonly currentBuzzer?: PlayerId;
  readonly blockedPlayerIds: ReadonlySet<PlayerId>;
  readonly outcome?: RoundOutcome;

  private constructor(args: {
    trackIndex: number;
    status: RoundStatus;
    currentBuzzer?: PlayerId;
    blockedPlayerIds: ReadonlySet<PlayerId>;
    outcome?: RoundOutcome;
  }) {
    this.trackIndex = args.trackIndex;
    this.status = args.status;
    this.currentBuzzer = args.currentBuzzer;
    this.blockedPlayerIds = args.blockedPlayerIds;
    this.outcome = args.outcome;
  }

  static start(trackIndex: number): Round {
    return new Round({
      trackIndex,
      status: "playing",
      blockedPlayerIds: new Set(),
    });
  }

  isPlayerBlocked(playerId: PlayerId): boolean {
    return this.blockedPlayerIds.has(playerId);
  }

  markBuzzed(playerId: PlayerId): Round {
    if (this.status !== "playing") throw new InvalidRoundTransitionError(this.status, "buzz");
    if (this.blockedPlayerIds.has(playerId)) throw new PlayerAlreadyBlockedError(playerId);
    return new Round({
      trackIndex: this.trackIndex,
      status: "buzzed",
      currentBuzzer: playerId,
      blockedPlayerIds: this.blockedPlayerIds,
    });
  }

  markResolved(outcome: RoundOutcome): Round {
    const allowedFromPlaying = outcome === "skip";
    if (this.status === "playing" && !allowedFromPlaying) {
      throw new InvalidRoundTransitionError(this.status, `resolve as "${outcome}"`);
    }
    if (this.status !== "playing" && this.status !== "buzzed") {
      throw new InvalidRoundTransitionError(this.status, `resolve as "${outcome}"`);
    }
    return new Round({
      trackIndex: this.trackIndex,
      status: "resolved",
      currentBuzzer: this.currentBuzzer,
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
      blockedPlayerIds: nextBlocked,
    });
  }
}
