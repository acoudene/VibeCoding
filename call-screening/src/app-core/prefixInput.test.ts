import { describe, it, expect } from "vitest";
import { normalizePrefixValue, InvalidPrefixError } from "./prefixInput";

describe("normalizePrefixValue (FR-4)", () => {
  it("normalise un préfixe national en E.164", () => {
    expect(normalizePrefixValue("0899")).toBe("+33899");
  });

  it("conserve un préfixe déjà en +", () => {
    expect(normalizePrefixValue("+33899")).toBe("+33899");
  });

  it("rejette une valeur non numérique", () => {
    expect(() => normalizePrefixValue("spam")).toThrow(InvalidPrefixError);
  });

  it("rejette une valeur vide", () => {
    expect(() => normalizePrefixValue("")).toThrow(InvalidPrefixError);
  });
});
