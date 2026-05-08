import { describe, expect, it } from "vitest";

import { levenshtein, normalize } from "./answer-matcher";

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
      expect(normalize("AC/DC")).toBe("ac dc");
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

  describe("levenshtein", () => {
    it("returns 0 for equal strings", () => {
      expect(levenshtein("", "")).toBe(0);
      expect(levenshtein("abc", "abc")).toBe(0);
      expect(levenshtein("daft punk", "daft punk")).toBe(0);
    });

    it("returns the length when one side is empty", () => {
      expect(levenshtein("", "abc")).toBe(3);
      expect(levenshtein("hello", "")).toBe(5);
    });

    it("counts single-character substitutions, insertions, deletions", () => {
      expect(levenshtein("abc", "abd")).toBe(1);
      expect(levenshtein("abc", "ab")).toBe(1);
      expect(levenshtein("ab", "abc")).toBe(1);
    });

    it("counts multiple edits", () => {
      expect(levenshtein("abc", "axy")).toBe(2);
      expect(levenshtein("kitten", "sitting")).toBe(3);
      expect(levenshtein("daft", "draft")).toBe(1);
      expect(levenshtein("beatles", "beetles")).toBe(1);
    });
  });
});
