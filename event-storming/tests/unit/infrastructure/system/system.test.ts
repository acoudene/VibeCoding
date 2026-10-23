import { describe, expect, it } from "vitest";
import { CryptoIdGenerator } from "../../../../src/infrastructure/system/crypto-id-generator";
import { SystemClock } from "../../../../src/infrastructure/system/system-clock";

describe("CryptoIdGenerator", () => {
  it("produit 128 bits en base64url sans padding (22 caractères)", () => {
    const id = new CryptoIdGenerator().next();
    expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    const base64 = id.replaceAll("-", "+").replaceAll("_", "/") + "==";
    expect(Buffer.from(base64, "base64")).toHaveLength(16);
  });

  it("produit des identifiants distincts", () => {
    const generator = new CryptoIdGenerator();
    const ids = new Set(Array.from({ length: 1000 }, () => generator.next()));
    expect(ids.size).toBe(1000);
  });
});

describe("SystemClock", () => {
  it("donne l'heure courante", () => {
    const before = Date.now();
    const now = new SystemClock().now().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});
