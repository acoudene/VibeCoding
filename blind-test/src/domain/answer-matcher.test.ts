import { describe, expect, it } from "vitest";

import { levenshtein, matchAnswer, normalize } from "./answer-matcher";

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

  describe("matchAnswer", () => {
    const expected = { expectedTitle: "One More Time", expectedArtist: "Daft Punk" };

    it("is correct when title and artist both match exactly", () => {
      expect(
        matchAnswer({ title: "One More Time", artist: "Daft Punk" }, expected),
      ).toEqual({ titleOk: true, artistOk: true, outcome: "correct" });
    });

    it("tolerates typos within Levenshtein <= 2 on normalized values", () => {
      expect(
        matchAnswer({ title: "one more tim", artist: "daftpunk" }, expected),
      ).toMatchObject({ outcome: "correct" });
    });

    it("rejects typos beyond Levenshtein 2", () => {
      expect(
        matchAnswer({ title: "wun more thyme", artist: "Daft Punk" }, expected),
      ).toMatchObject({ titleOk: false, artistOk: true, outcome: "half" });
    });

    it("is half when only the title matches", () => {
      expect(
        matchAnswer({ title: "One More Time", artist: "Justice" }, expected),
      ).toEqual({ titleOk: true, artistOk: false, outcome: "half" });
    });

    it("is half when only the artist matches", () => {
      expect(
        matchAnswer({ title: "Around the World", artist: "Daft Punk" }, expected),
      ).toEqual({ titleOk: false, artistOk: true, outcome: "half" });
    });

    it("is wrong when neither matches", () => {
      expect(
        matchAnswer({ title: "Smells Like Teen Spirit", artist: "Nirvana" }, expected),
      ).toEqual({ titleOk: false, artistOk: false, outcome: "wrong" });
    });

    it("treats missing submitted fields as not OK", () => {
      expect(
        matchAnswer({ title: "One More Time" }, expected),
      ).toEqual({ titleOk: true, artistOk: false, outcome: "half" });
      expect(
        matchAnswer({ artist: "Daft Punk" }, expected),
      ).toEqual({ titleOk: false, artistOk: true, outcome: "half" });
      expect(matchAnswer({}, expected)).toEqual({
        titleOk: false,
        artistOk: false,
        outcome: "wrong",
      });
    });

    it("when track has no expected artist, judges only the title", () => {
      const titleOnlyTrack = { expectedTitle: "Mystery", expectedArtist: undefined };
      expect(
        matchAnswer({ title: "Mystery", artist: "anything" }, titleOnlyTrack),
      ).toEqual({ titleOk: true, artistOk: true, outcome: "correct" });
      expect(
        matchAnswer({ title: "Wrong" }, titleOnlyTrack),
      ).toMatchObject({ titleOk: false, outcome: "wrong" });
    });
  });
});
