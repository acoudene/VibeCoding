import { describe, expect, it } from "vitest";

import {
  AlreadySubmittedError,
  BUZZ_GRACE_MS,
  BuzzTooEarlyError,
  InvalidRoundTransitionError,
  PlayerAlreadyBlockedError,
  Round,
} from "./round";

describe("Round.start", () => {
  it("returns a fresh playing round at the given track index", () => {
    const round = Round.start(0);
    expect(round.trackIndex).toBe(0);
    expect(round.status).toBe("playing");
    expect(round.currentBuzzer).toBeUndefined();
    expect(round.outcome).toBeUndefined();
    expect(round.blockedPlayerIds.size).toBe(0);
  });

  it("stores the startedAt timestamp passed by the caller", () => {
    expect(Round.start(2, 1_700_000_000_000).startedAt).toBe(1_700_000_000_000);
  });
});

describe("Round.restart", () => {
  it("preserves the trackIndex and blocked players, but resets startedAt and status", () => {
    const blocked = Round.start(3, 1000).markBuzzed("p1", 1500).block();
    const restarted = Round.restart(blocked, 5000);
    expect(restarted.trackIndex).toBe(3);
    expect(restarted.status).toBe("playing");
    expect(restarted.startedAt).toBe(5000);
    expect(restarted.blockedPlayerIds.has("p1")).toBe(true);
    expect(restarted.currentBuzzer).toBeUndefined();
  });
});

describe("Round.markBuzzed (R9 grace period)", () => {
  it("rejects a buzz received during the first 500 ms", () => {
    const r = Round.start(0, 1000);
    expect(() => r.markBuzzed("p1", 1000 + BUZZ_GRACE_MS - 1)).toThrow(BuzzTooEarlyError);
    expect(() => r.markBuzzed("p1", 1000 + 200)).toThrow(BuzzTooEarlyError);
    expect(() => r.markBuzzed("p1", 1000)).toThrow(BuzzTooEarlyError);
  });

  it("accepts a buzz exactly at the grace boundary", () => {
    const r = Round.start(0, 1000).markBuzzed("p1", 1000 + BUZZ_GRACE_MS);
    expect(r.status).toBe("buzzed");
    expect(r.currentBuzzer).toBe("p1");
  });

  it("does not enforce the grace period when no timestamp is provided", () => {
    const r = Round.start(0, 1000).markBuzzed("p1");
    expect(r.status).toBe("buzzed");
  });
});

describe("Round.markBuzzed", () => {
  it("transitions playing -> buzzed and stores the buzzer", () => {
    const buzzed = Round.start(0).markBuzzed("p1");
    expect(buzzed.status).toBe("buzzed");
    expect(buzzed.currentBuzzer).toBe("p1");
  });

  it("rejects buzzing when not playing", () => {
    const buzzed = Round.start(0).markBuzzed("p1");
    expect(() => buzzed.markBuzzed("p2")).toThrow(InvalidRoundTransitionError);
    const resolved = buzzed.markResolved("correct");
    expect(() => resolved.markBuzzed("p3")).toThrow(InvalidRoundTransitionError);
  });

  it("does not mutate the original", () => {
    const playing = Round.start(0);
    const buzzed = playing.markBuzzed("p1");
    expect(playing.status).toBe("playing");
    expect(playing.currentBuzzer).toBeUndefined();
    expect(buzzed).not.toBe(playing);
  });
});

describe("Round.markResolved", () => {
  it("transitions buzzed -> resolved with the outcome", () => {
    const resolved = Round.start(0).markBuzzed("p1").markResolved("correct");
    expect(resolved.status).toBe("resolved");
    expect(resolved.outcome).toBe("correct");
  });

  it("transitions playing -> resolved for a skip outcome", () => {
    const resolved = Round.start(0).markResolved("skip");
    expect(resolved.status).toBe("resolved");
    expect(resolved.outcome).toBe("skip");
  });

  it("rejects correct/half resolution from playing", () => {
    const playing = Round.start(0);
    expect(() => playing.markResolved("correct")).toThrow(InvalidRoundTransitionError);
    expect(() => playing.markResolved("half")).toThrow(InvalidRoundTransitionError);
  });

  it("allows wrong resolution from playing (used when all players are blocked)", () => {
    const resolved = Round.start(0).markResolved("wrong");
    expect(resolved.status).toBe("resolved");
    expect(resolved.outcome).toBe("wrong");
  });

  it("rejects resolving an already-resolved round", () => {
    const resolved = Round.start(0).markResolved("skip");
    expect(() => resolved.markResolved("skip")).toThrow(InvalidRoundTransitionError);
  });
});

describe("Round.block (wrong answer)", () => {
  it("returns to playing with the buzzer added to blockedPlayerIds and currentBuzzer cleared", () => {
    const blocked = Round.start(0).markBuzzed("p1").block();
    expect(blocked.status).toBe("playing");
    expect(blocked.currentBuzzer).toBeUndefined();
    expect(blocked.blockedPlayerIds.has("p1")).toBe(true);
  });

  it("preserves previously blocked players", () => {
    const r = Round.start(0).markBuzzed("p1").block();
    const r2 = r.markBuzzed("p2").block();
    expect(r2.blockedPlayerIds.has("p1")).toBe(true);
    expect(r2.blockedPlayerIds.has("p2")).toBe(true);
  });

  it("rejects block when not in buzzed state", () => {
    expect(() => Round.start(0).block()).toThrow(InvalidRoundTransitionError);
    const resolved = Round.start(0).markResolved("skip");
    expect(() => resolved.block()).toThrow(InvalidRoundTransitionError);
  });
});

describe("Round.isPlayerBlocked", () => {
  it("returns true for blocked players", () => {
    const r = Round.start(0).markBuzzed("p1").block();
    expect(r.isPlayerBlocked("p1")).toBe(true);
  });

  it("returns false for unblocked players", () => {
    const r = Round.start(0);
    expect(r.isPlayerBlocked("ghost")).toBe(false);
  });
});

describe("Round.markBuzzed (blocked players)", () => {
  it("rejects buzzing by an already-blocked player", () => {
    const r = Round.start(0).markBuzzed("p1").block();
    expect(() => r.markBuzzed("p1")).toThrow(PlayerAlreadyBlockedError);
  });
});

describe("Round.submitAnswer (R10 — input mode)", () => {
  it("records a player's submission", () => {
    const r = Round.start(0, 1000).submitAnswer(
      "p1",
      { title: "One More Time", artist: "Daft Punk" },
      2000,
    );
    const sub = r.submissionOf("p1");
    expect(sub).toBeDefined();
    expect(sub?.title).toBe("One More Time");
    expect(sub?.artist).toBe("Daft Punk");
    expect(sub?.at).toBe(2000);
  });

  it("preserves status and previous submissions when another player submits", () => {
    const r = Round.start(0, 1000)
      .submitAnswer("p1", { title: "A" }, 1500)
      .submitAnswer("p2", { title: "B" }, 1600);
    expect(r.status).toBe("playing");
    expect(r.submissionOf("p1")?.title).toBe("A");
    expect(r.submissionOf("p2")?.title).toBe("B");
  });

  it("rejects a second submission from the same player (R10)", () => {
    const r = Round.start(0, 1000).submitAnswer("p1", { title: "A" }, 1500);
    expect(() => r.submitAnswer("p1", { title: "B" }, 1600)).toThrow(AlreadySubmittedError);
  });

  it("rejects submission when round is not playing", () => {
    const r = Round.start(0, 1000).markResolved("skip");
    expect(() => r.submitAnswer("p1", { title: "A" }, 1500)).toThrow(InvalidRoundTransitionError);
  });

  it("rejects submission with neither title nor artist", () => {
    const r = Round.start(0, 1000);
    expect(() => r.submitAnswer("p1", {}, 1500)).toThrow();
    expect(() => r.submitAnswer("p1", { title: "  ", artist: "  " }, 1500)).toThrow();
  });
});

describe("Round.resolveByInput", () => {
  const expected = { expectedTitle: "One More Time", expectedArtist: "Daft Punk" };

  it("returns 'wrong' for players who did not submit (US-69)", () => {
    const r = Round.start(0, 1000);
    const outcomes = r.resolveByInput(expected, ["p1", "p2"]);
    expect(outcomes.get("p1")).toBe("wrong");
    expect(outcomes.get("p2")).toBe("wrong");
  });

  it("computes outcomes from submissions via R11 matching", () => {
    const r = Round.start(0, 1000)
      .submitAnswer("p1", { title: "One More Time", artist: "Daft Punk" }, 1500)
      .submitAnswer("p2", { title: "One More Time", artist: "Justice" }, 1600)
      .submitAnswer("p3", { title: "Smells Like Teen Spirit", artist: "Nirvana" }, 1700);
    const outcomes = r.resolveByInput(expected, ["p1", "p2", "p3"]);
    expect(outcomes.get("p1")).toBe("correct");
    expect(outcomes.get("p2")).toBe("half");
    expect(outcomes.get("p3")).toBe("wrong");
  });

  it("ignores submissions from players not in the active list", () => {
    const r = Round.start(0, 1000).submitAnswer(
      "ghost",
      { title: "One More Time", artist: "Daft Punk" },
      1500,
    );
    const outcomes = r.resolveByInput(expected, ["p1"]);
    expect(outcomes.has("ghost")).toBe(false);
    expect(outcomes.get("p1")).toBe("wrong");
  });

  it("transitions the round to resolved with outcome 'input'", () => {
    const r = Round.start(0, 1000).submitAnswer(
      "p1",
      { title: "One More Time", artist: "Daft Punk" },
      1500,
    );
    const next = r.markResolvedByInput();
    expect(next.status).toBe("resolved");
  });
});
