import { describe, expect, it } from "vitest";
import { AbilityScores, InvalidAbilityAssignmentError } from "../../src/domain/characters/ability-scores";
import { Character, CharacterNameRequiredError } from "../../src/domain/characters/character";
import { CharacterAlreadyExistsError } from "../../src/domain/characters/character-repository";
import { InMemoryCharacterRepository } from "../../src/infrastructure/persistence/in-memory-character-repository";

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

  it("rejects a missing ability", () => {
    const missing = { ...valid, CHA: undefined } as unknown as typeof valid;
    expect(() => AbilityScores.fromStandardArray(missing)).toThrow(InvalidAbilityAssignmentError);
  });

  it("compares by value", () => {
    const swapped = { ...valid, STR: 14, DEX: 15 };
    expect(AbilityScores.fromStandardArray(valid).equals(AbilityScores.fromStandardArray({ ...valid }))).toBe(true);
    expect(AbilityScores.fromStandardArray(valid).equals(AbilityScores.fromStandardArray(swapped))).toBe(false);
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

describe("InMemoryCharacterRepository (contrat du port)", () => {
  const scores = AbilityScores.fromStandardArray(valid);

  it("refuses a second character for the same (session, player) at write time", async () => {
    const repo = new InMemoryCharacterRepository();
    await repo.add(Character.create("s1", "p1", "Aria", scores));
    await expect(repo.add(Character.create("s1", "p1", "Borin", scores))).rejects.toThrow(CharacterAlreadyExistsError);
    expect((await repo.find("s1", "p1"))?.name).toBe("Aria");
  });

  it("allows the same player in another session", async () => {
    const repo = new InMemoryCharacterRepository();
    await repo.add(Character.create("s1", "p1", "Aria", scores));
    await expect(repo.add(Character.create("s2", "p1", "Aria", scores))).resolves.toBeUndefined();
  });
});
