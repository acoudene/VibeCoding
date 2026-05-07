import { describe, expect, it } from "vitest";

import {
  EmptyTrackFieldError,
  InvalidStartSecondsError,
  InvalidYoutubeIdError,
  Track,
} from "./track";

describe("Track", () => {
  const VALID_ID = "dQw4w9WgXcQ";

  describe("create", () => {
    it("returns a track with the given fields", () => {
      const t = Track.create({
        expectedTitle: "Never Gonna Give You Up",
        expectedArtist: "Rick Astley",
        youtubeId: VALID_ID,
      });
      expect(t.expectedTitle).toBe("Never Gonna Give You Up");
      expect(t.expectedArtist).toBe("Rick Astley");
      expect(t.youtubeId).toBe(VALID_ID);
      expect(t.startSeconds).toBeUndefined();
    });

    it("accepts an optional startSeconds", () => {
      const t = Track.create({
        expectedTitle: "Title",
        expectedArtist: "Artist",
        youtubeId: VALID_ID,
        startSeconds: 42,
      });
      expect(t.startSeconds).toBe(42);
    });

    it("accepts startSeconds = 0", () => {
      const t = Track.create({
        expectedTitle: "Title",
        expectedArtist: "Artist",
        youtubeId: VALID_ID,
        startSeconds: 0,
      });
      expect(t.startSeconds).toBe(0);
    });
  });

  describe("required fields", () => {
    it("rejects an empty expectedTitle", () => {
      expect(() =>
        Track.create({ expectedTitle: "", expectedArtist: "A", youtubeId: VALID_ID }),
      ).toThrow(EmptyTrackFieldError);
    });

    it("rejects a whitespace-only expectedTitle", () => {
      expect(() =>
        Track.create({ expectedTitle: "   ", expectedArtist: "A", youtubeId: VALID_ID }),
      ).toThrow(EmptyTrackFieldError);
    });

    it("rejects an empty expectedArtist", () => {
      expect(() =>
        Track.create({ expectedTitle: "T", expectedArtist: "", youtubeId: VALID_ID }),
      ).toThrow(EmptyTrackFieldError);
    });

    it("rejects an empty youtubeId", () => {
      expect(() =>
        Track.create({ expectedTitle: "T", expectedArtist: "A", youtubeId: "" }),
      ).toThrow(InvalidYoutubeIdError);
    });
  });

  describe("youtubeId format", () => {
    it.each([
      "tooShort",
      "wayTooLongValue",
      "abcdefghij!", // 11 chars but illegal !
      "abcdefghij ", // space
    ])("rejects %s", (id) => {
      expect(() =>
        Track.create({ expectedTitle: "T", expectedArtist: "A", youtubeId: id }),
      ).toThrow(InvalidYoutubeIdError);
    });

    it.each(["dQw4w9WgXcQ", "abc-DEF_123", "_-_-_-_-_-_"])("accepts %s", (id) => {
      const t = Track.create({ expectedTitle: "T", expectedArtist: "A", youtubeId: id });
      expect(t.youtubeId).toBe(id);
    });
  });

  describe("startSeconds invariants", () => {
    it("rejects a negative startSeconds", () => {
      expect(() =>
        Track.create({
          expectedTitle: "T",
          expectedArtist: "A",
          youtubeId: VALID_ID,
          startSeconds: -1,
        }),
      ).toThrow(InvalidStartSecondsError);
    });

    it("rejects a non-finite startSeconds", () => {
      expect(() =>
        Track.create({
          expectedTitle: "T",
          expectedArtist: "A",
          youtubeId: VALID_ID,
          startSeconds: Number.POSITIVE_INFINITY,
        }),
      ).toThrow(InvalidStartSecondsError);
    });
  });
});
