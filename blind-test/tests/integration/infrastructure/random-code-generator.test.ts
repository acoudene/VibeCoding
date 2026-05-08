import { describe, expect, it } from "vitest";

import { RoomCode } from "@/domain/room-code";
import { RandomCodeGenerator } from "@/infrastructure/code/random-code-generator";

describe("RandomCodeGenerator", () => {
  it("returns codes that pass RoomCode.isValid", () => {
    const gen = new RandomCodeGenerator();
    for (let i = 0; i < 100; i++) {
      expect(RoomCode.isValid(gen.generate())).toBe(true);
    }
  });

  it("returns 6-character codes", () => {
    const gen = new RandomCodeGenerator();
    expect(gen.generate()).toHaveLength(6);
  });

  it("accepts an injected RNG for deterministic tests", () => {
    const gen = new RandomCodeGenerator(() => 0); // first alphabet char
    const code = gen.generate();
    expect(code).toBe(RoomCode.ALPHABET[0]!.repeat(6));
  });

  it("produces variety with crypto-backed RNG (not all the same)", () => {
    const gen = new RandomCodeGenerator();
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) seen.add(gen.generate());
    // 50 draws from a 32^6 space — collisions are essentially impossible.
    expect(seen.size).toBeGreaterThan(40);
  });
});
