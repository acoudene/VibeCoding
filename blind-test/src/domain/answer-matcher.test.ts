import { describe, expect, it } from "vitest";

import { normalize } from "./answer-matcher";

describe("AnswerMatcher", () => {
  describe("normalize", () => {
    it("lowercases the input", () => {
      expect(normalize("Daft Punk")).toBe("daft punk");
    });

    it("strips diacritics (NFD)", () => {
      expect(normalize("Béyoncé")).toBe("beyonce");
      expect(normalize("Édith Piaf")).toBe("edith piaf");
      expect(normalize("Niño")).toBe("nino");
    });

    it("removes punctuation and non-alphanumerics, keeping spaces", () => {
      expect(normalize("Daft Punk!")).toBe("daft punk");
      expect(normalize("AC/DC")).toBe("acdc");
      expect(normalize("Guns N' Roses")).toBe("guns n roses");
    });

    it("collapses repeated whitespace and trims", () => {
      expect(normalize("  Air  ")).toBe("air");
      expect(normalize("daft   punk")).toBe("daft punk");
      expect(normalize("\tAir\n")).toBe("air");
    });

    it("returns empty string for empty or punctuation-only input", () => {
      expect(normalize("")).toBe("");
      expect(normalize("   ")).toBe("");
      expect(normalize("!!!---")).toBe("");
    });
  });
});
