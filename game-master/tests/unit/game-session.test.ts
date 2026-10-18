import { describe, expect, it } from "vitest";
import { GameSession } from "../../src/domain/session/game-session";

describe("GameSession", () => {
  it("requires at least one player", () => {
    expect(() => new GameSession("s", [])).toThrow();
  });

  it("numbers turns sequentially", () => {
    const s = new GameSession("s", ["p1", "p2"]);
    s.recordTurn("p1", "ouvre la porte", "La porte grince.");
    expect(s.recordTurn("p2", "allume une torche", "La flamme danse.").number).toBe(2);
  });

  it("rejects a player outside the session", () => {
    expect(() => new GameSession("s", ["p1"]).recordTurn("x", "agit", "n")).toThrow();
  });

  it("rejects an empty action", () => {
    expect(() => new GameSession("s", ["p1"]).recordTurn("p1", "  ", "n")).toThrow();
  });
});
