import { describe, expect, it } from "vitest";

import { generateCode } from "./generate-code";
import { RoomCode } from "./room-code";

function seedRng(values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i++;
    return v ?? 0;
  };
}

describe("generateCode", () => {
  it("returns a 6-character string", () => {
    const code = generateCode(Math.random);
    expect(code).toHaveLength(6);
  });

  it("returns a code that passes RoomCode.isValid", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateCode(Math.random);
      expect(RoomCode.isValid(code)).toBe(true);
    }
  });

  it("is deterministic given the same RNG values", () => {
    const rng1 = seedRng([0, 0.1, 0.5, 0.9, 0.99, 0.31]);
    const rng2 = seedRng([0, 0.1, 0.5, 0.9, 0.99, 0.31]);
    expect(generateCode(rng1)).toBe(generateCode(rng2));
  });

  it("only uses characters from the safe alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateCode(Math.random);
      for (const ch of code) {
        expect(RoomCode.ALPHABET).toContain(ch);
      }
    }
  });

  it("maps rng=0 to the first alphabet char", () => {
    const code = generateCode(seedRng([0]));
    expect(code).toBe(RoomCode.ALPHABET[0]!.repeat(6));
  });

  it("maps rng just below 1 to the last alphabet char", () => {
    const lastIdx = RoomCode.ALPHABET.length - 1;
    const justBelow = lastIdx / RoomCode.ALPHABET.length + 1e-9;
    const code = generateCode(seedRng([0.9999999]));
    expect(code).toBe(RoomCode.ALPHABET[lastIdx]!.repeat(6));
    expect(justBelow).toBeLessThan(1);
  });

  it("clamps rng output >= 1 to a valid index (defensive)", () => {
    const code = generateCode(seedRng([1, 1.5, 2]));
    expect(RoomCode.isValid(code)).toBe(true);
  });
});
