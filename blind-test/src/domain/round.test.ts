import { describe, expect, it } from "vitest";

import { InvalidRoundTransitionError, PlayerAlreadyBlockedError, Round } from "./round";

describe("Round.start", () => {
  it("returns a fresh playing round at the given track index", () => {
    const round = Round.start(0);
    expect(round.trackIndex).toBe(0);
    expect(round.status).toBe("playing");
    expect(round.currentBuzzer).toBeUndefined();
    expect(round.outcome).toBeUndefined();
    expect(round.blockedPlayerIds.size).toBe(0);
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

  it("rejects non-skip resolution from playing", () => {
    const playing = Round.start(0);
    expect(() => playing.markResolved("correct")).toThrow(InvalidRoundTransitionError);
    expect(() => playing.markResolved("wrong")).toThrow(InvalidRoundTransitionError);
    expect(() => playing.markResolved("half")).toThrow(InvalidRoundTransitionError);
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
