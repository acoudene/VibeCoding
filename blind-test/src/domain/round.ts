import { type ExpectedAnswer, matchAnswer, type MatchOutcome } from "./answer-matcher";
import type { PlayerId } from "./player";

export type RoundStatus = "playing" | "buzzed" | "resolved";
export type RoundOutcome = "correct" | "wrong" | "half" | "skip";

export interface Submission {
  readonly title?: string;
  readonly artist?: string;
  readonly at: number;
}

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

export class AlreadySubmittedError extends Error {
  constructor(playerId: PlayerId) {
    super(`Player "${playerId}" has already submitted an answer for this round`);
    this.name = "AlreadySubmittedError";
  }
}

export class EmptySubmissionError extends Error {
  constructor() {
    super("Submission must include at least one of: title, artist");
    this.name = "EmptySubmissionError";
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
  readonly submissions: ReadonlyMap<PlayerId, Submission>;

  private constructor(args: {
    trackIndex: number;
    status: RoundStatus;
    startedAt: number;
    currentBuzzer?: PlayerId;
    buzzedAt?: number;
    blockedPlayerIds: ReadonlySet<PlayerId>;
    outcome?: RoundOutcome;
    submissions: ReadonlyMap<PlayerId, Submission>;
  }) {
    this.trackIndex = args.trackIndex;
    this.status = args.status;
    this.startedAt = args.startedAt;
    this.currentBuzzer = args.currentBuzzer;
    this.buzzedAt = args.buzzedAt;
    this.blockedPlayerIds = args.blockedPlayerIds;
    this.outcome = args.outcome;
    this.submissions = args.submissions;
  }

  static start(trackIndex: number, startedAt: number = 0): Round {
    return new Round({
      trackIndex,
      status: "playing",
      startedAt,
      blockedPlayerIds: new Set(),
      submissions: new Map(),
    });
  }

  static restart(previous: Round, startedAt: number): Round {
    return new Round({
      trackIndex: previous.trackIndex,
      status: "playing",
      startedAt,
      blockedPlayerIds: previous.blockedPlayerIds,
      submissions: new Map(),
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
      submissions: this.submissions,
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
      submissions: this.submissions,
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
      submissions: this.submissions,
    });
  }

  submissionOf(playerId: PlayerId): Submission | undefined {
    return this.submissions.get(playerId);
  }

  submitAnswer(
    playerId: PlayerId,
    submission: { title?: string; artist?: string },
    at: number,
  ): Round {
    if (this.status !== "playing") {
      throw new InvalidRoundTransitionError(this.status, "submitAnswer");
    }
    if (this.submissions.has(playerId)) throw new AlreadySubmittedError(playerId);
    const title = submission.title?.trim();
    const artist = submission.artist?.trim();
    if ((title === undefined || title === "") && (artist === undefined || artist === "")) {
      throw new EmptySubmissionError();
    }
    const next = new Map(this.submissions);
    next.set(playerId, { title, artist, at });
    return new Round({
      trackIndex: this.trackIndex,
      status: this.status,
      startedAt: this.startedAt,
      currentBuzzer: this.currentBuzzer,
      buzzedAt: this.buzzedAt,
      blockedPlayerIds: this.blockedPlayerIds,
      submissions: next,
    });
  }

  resolveByInput(
    expected: ExpectedAnswer,
    activePlayerIds: readonly PlayerId[],
  ): Map<PlayerId, MatchOutcome> {
    const outcomes = new Map<PlayerId, MatchOutcome>();
    for (const playerId of activePlayerIds) {
      const submission = this.submissions.get(playerId);
      if (submission === undefined) {
        outcomes.set(playerId, "wrong");
        continue;
      }
      outcomes.set(playerId, matchAnswer(submission, expected).outcome);
    }
    return outcomes;
  }

  markResolvedByInput(): Round {
    if (this.status !== "playing") {
      throw new InvalidRoundTransitionError(this.status, "markResolvedByInput");
    }
    return new Round({
      trackIndex: this.trackIndex,
      status: "resolved",
      startedAt: this.startedAt,
      blockedPlayerIds: this.blockedPlayerIds,
      outcome: undefined,
      submissions: this.submissions,
    });
  }
}
