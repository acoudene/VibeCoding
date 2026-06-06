import { describe, it, expect } from "vitest";
import { normalizePhoneNumber } from "./normalize";

describe("normalizePhoneNumber (FR-1)", () => {
  it("conserve un numéro déjà en E.164", () => {
    expect(normalizePhoneNumber("+33612345678")).toBe("+33612345678");
  });

  it("nettoie les séparateurs (espaces, tirets, points, parenthèses)", () => {
    expect(normalizePhoneNumber("+33 (6) 12-34.56 78")).toBe("+33612345678");
  });

  it("convertit un préfixe d'appel international 00 en +", () => {
    expect(normalizePhoneNumber("0033612345678")).toBe("+33612345678");
  });

  it("interprète un numéro national FR 0X... avec l'indicatif pays par défaut", () => {
    expect(normalizePhoneNumber("0899700000")).toBe("+33899700000");
  });

  it("respecte un indicatif pays par défaut explicite", () => {
    expect(normalizePhoneNumber("0612345678", "+32")).toBe("+32612345678");
  });

  it("retourne null pour une entrée vide", () => {
    expect(normalizePhoneNumber("")).toBeNull();
    expect(normalizePhoneNumber("   ")).toBeNull();
  });

  it("retourne null pour une entrée non numérique", () => {
    expect(normalizePhoneNumber("abc")).toBeNull();
    expect(normalizePhoneNumber("+")).toBeNull();
  });
});
