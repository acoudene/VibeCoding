import { describe, expect, it } from "vitest";
import { AbilityScores, InvalidAbilityAssignmentError } from "../../src/domain/characters/ability-scores";
import { Character, CharacterNameRequiredError } from "../../src/domain/characters/character";

const valid = { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 };

describe("AbilityScores.fromStandardArray", () => {
  it("accepts any permutation of the standard array", () => {
    const s = AbilityScores.fromStandardArray({ STR: 8, DEX: 10, CON: 12, INT: 13, WIS: 14, CHA: 15 });
    expect(s.get("CHA").modifier).toBe(2);
    expect(s.get("STR").modifier).toBe(-1);
  });

  it.each([
    ["value outside the array", { ...valid, STR: 18 }],
    ["duplicated value", { ...valid, DEX: 15 }],
  ])("rejects %s", (_label, assignment) => {
    expect(() => AbilityScores.fromStandardArray(assignment)).toThrow(InvalidAbilityAssignmentError);
  });

  it("round-trips values", () => {
    expect(AbilityScores.fromStandardArray(valid).toValues()).toEqual(valid);
  });
});

describe("Character", () => {
  const scores = AbilityScores.fromStandardArray(valid);

  it("trims the name", () => {
    expect(Character.create("s1", "p1", "  Aria ", scores).name).toBe("Aria");
  });

  it("requires a name", () => {
    expect(() => Character.create("s1", "p1", "   ", scores)).toThrow(CharacterNameRequiredError);
  });
});
