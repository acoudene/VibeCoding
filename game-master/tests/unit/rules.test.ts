import { describe, expect, it } from "vitest";
import { resolveAbilityCheck } from "../../src/domain/rules/ability-check";
import { AbilityScore } from "../../src/domain/rules/ability-score";

const fixedDice = (n: number) => ({ roll: () => n });

describe("AbilityScore", () => {
  it.each([
    [1, -5],
    [8, -1],
    [10, 0],
    [11, 0],
    [15, 2],
    [20, 5],
    [30, 10],
  ])("score %i -> modifier %i", (score, modifier) => {
    expect(AbilityScore.of(score).modifier).toBe(modifier);
  });

  it.each([0, 31, 10.5])("rejects invalid score %s", (v) => {
    expect(() => AbilityScore.of(v)).toThrow(RangeError);
  });
});

describe("resolveAbilityCheck", () => {
  it("succeeds when total equals the DC", () => {
    const r = resolveAbilityCheck(AbilityScore.of(14), 12, fixedDice(10)); // 10 + 2
    expect(r).toMatchObject({ total: 12, success: true });
  });

  it("fails when total is below the DC", () => {
    expect(resolveAbilityCheck(AbilityScore.of(8), 10, fixedDice(10)).success).toBe(false);
  });
});
