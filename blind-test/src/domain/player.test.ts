import { describe, expect, it } from "vitest";

import { EmptyNicknameError, InvalidScoreError, NicknameTooLongError, Player } from "./player";

describe("Player", () => {
  describe("create", () => {
    it("returns a player with the given id and nickname, score 0, connected true", () => {
      const player = Player.create({ id: "p1", nickname: "Alice" });
      expect(player.id).toBe("p1");
      expect(player.nickname).toBe("Alice");
      expect(player.score).toBe(0);
      expect(player.connected).toBe(true);
    });

    it("rejects an empty nickname", () => {
      expect(() => Player.create({ id: "p1", nickname: "" })).toThrow(EmptyNicknameError);
    });

    it("rejects a whitespace-only nickname", () => {
      expect(() => Player.create({ id: "p1", nickname: "   " })).toThrow(EmptyNicknameError);
    });

    it("rejects a nickname longer than 20 characters", () => {
      expect(() => Player.create({ id: "p1", nickname: "a".repeat(21) })).toThrow(
        NicknameTooLongError,
      );
    });

    it("accepts a nickname of exactly 20 characters", () => {
      const player = Player.create({ id: "p1", nickname: "a".repeat(20) });
      expect(player.nickname.length).toBe(20);
    });
  });

  describe("score invariants", () => {
    it("accepts integer scores", () => {
      const p = Player.create({ id: "p1", nickname: "Alice", score: 3 });
      expect(p.score).toBe(3);
    });

    it("accepts half-integer scores", () => {
      const p = Player.create({ id: "p1", nickname: "Alice", score: 2.5 });
      expect(p.score).toBe(2.5);
    });

    it("rejects negative scores", () => {
      expect(() => Player.create({ id: "p1", nickname: "Alice", score: -1 })).toThrow(
        InvalidScoreError,
      );
    });

    it("rejects non half-step scores like 1.3", () => {
      expect(() => Player.create({ id: "p1", nickname: "Alice", score: 1.3 })).toThrow(
        InvalidScoreError,
      );
    });
  });

  describe("addPoints", () => {
    it("returns a new player with the points added", () => {
      const p = Player.create({ id: "p1", nickname: "Alice" });
      const after = p.addPoints(1);
      expect(after.score).toBe(1);
      expect(p.score).toBe(0);
    });

    it("supports half points", () => {
      const p = Player.create({ id: "p1", nickname: "Alice" });
      expect(p.addPoints(0.5).score).toBe(0.5);
    });

    it("rejects adding a non half-step value", () => {
      const p = Player.create({ id: "p1", nickname: "Alice" });
      expect(() => p.addPoints(0.3)).toThrow(InvalidScoreError);
    });

    it("rejects adding a negative amount", () => {
      const p = Player.create({ id: "p1", nickname: "Alice" });
      expect(() => p.addPoints(-1)).toThrow(InvalidScoreError);
    });
  });

  describe("setConnected", () => {
    it("returns a new player with the connected flag flipped, score preserved", () => {
      const p = Player.create({ id: "p1", nickname: "Alice" }).addPoints(2);
      const offline = p.setConnected(false);
      expect(offline.connected).toBe(false);
      expect(offline.score).toBe(2);
      expect(p.connected).toBe(true);
    });
  });
});
