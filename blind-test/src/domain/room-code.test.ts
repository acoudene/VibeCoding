import { describe, expect, it } from "vitest";

import { InvalidRoomCodeError, RoomCode } from "./room-code";

describe("RoomCode", () => {
  describe("isValid", () => {
    it("accepts a 6-char code from the safe alphabet", () => {
      expect(RoomCode.isValid("ABCDEF")).toBe(true);
      expect(RoomCode.isValid("23456789".slice(0, 6))).toBe(true);
      expect(RoomCode.isValid("HKMNPQ")).toBe(true);
    });

    it("is case-insensitive on input", () => {
      expect(RoomCode.isValid("abcdef")).toBe(true);
      expect(RoomCode.isValid("aBcDeF")).toBe(true);
    });

    it("rejects codes with the wrong length", () => {
      expect(RoomCode.isValid("ABC")).toBe(false);
      expect(RoomCode.isValid("ABCDEFG")).toBe(false);
      expect(RoomCode.isValid("")).toBe(false);
    });

    it.each(["O", "0", "I", "1"])("rejects forbidden character %s", (c) => {
      expect(RoomCode.isValid(`ABCDE${c}`)).toBe(false);
    });

    it("rejects non-alphanumeric characters", () => {
      expect(RoomCode.isValid("ABCDE-")).toBe(false);
      expect(RoomCode.isValid("ABCDE ")).toBe(false);
      expect(RoomCode.isValid("ABCD!F")).toBe(false);
    });

    it("rejects non-string input safely (defensive)", () => {
      expect(RoomCode.isValid(undefined as unknown as string)).toBe(false);
      expect(RoomCode.isValid(null as unknown as string)).toBe(false);
    });
  });

  describe("normalize", () => {
    it("returns the uppercase form when valid", () => {
      expect(RoomCode.normalize("abcdef")).toBe("ABCDEF");
      expect(RoomCode.normalize("ABCDEF")).toBe("ABCDEF");
    });

    it("throws InvalidRoomCodeError when invalid", () => {
      expect(() => RoomCode.normalize("ABC")).toThrow(InvalidRoomCodeError);
      expect(() => RoomCode.normalize("ABCDE0")).toThrow(InvalidRoomCodeError);
      expect(() => RoomCode.normalize("OOOOOO")).toThrow(InvalidRoomCodeError);
    });
  });

  describe("ALPHABET", () => {
    it("excludes the visually ambiguous characters O, 0, I, 1", () => {
      expect(RoomCode.ALPHABET).not.toContain("O");
      expect(RoomCode.ALPHABET).not.toContain("0");
      expect(RoomCode.ALPHABET).not.toContain("I");
      expect(RoomCode.ALPHABET).not.toContain("1");
    });

    it("has 32 distinct characters", () => {
      expect(RoomCode.ALPHABET.length).toBe(32);
      expect(new Set(RoomCode.ALPHABET).size).toBe(32);
    });
  });
});
