import { describe, it, expect } from "vitest";
import { decide } from "./decision";
import type { Prefix } from "./types";

const p = (value: string): Prefix => ({ id: value, value });

describe("decide (FR-2, FR-3)", () => {
  it("BLOQUE un numéro commençant par un préfixe interdit", () => {
    const d = decide("+33899700000", [p("+33899")]);
    expect(d.decision).toBe("BLOCK");
    expect(d.matchedPrefix).toBe("+33899");
  });

  it("renvoie l'action VOICEMAIL et marque spam quand bloqué", () => {
    const d = decide("+33899700000", [p("+33899")]);
    expect(d.action).toBe("VOICEMAIL");
    expect(d.spam).toBe(true);
  });

  it("AUTORISE un numéro sans préfixe correspondant", () => {
    const d = decide("+33612345678", [p("+33899")]);
    expect(d.decision).toBe("ALLOW");
    expect(d.action).toBe("RING");
    expect(d.spam).toBe(false);
    expect(d.matchedPrefix).toBeNull();
  });

  it("retient le préfixe le plus long (le plus spécifique) en cas de chevauchement", () => {
    const d = decide("+338991234567", [p("+33"), p("+33899"), p("+338")]);
    expect(d.decision).toBe("BLOCK");
    expect(d.matchedPrefix).toBe("+33899");
  });

  it("AUTORISE (sans bloquer) un numéro invalide/null mais signale l'absence de normalisation", () => {
    const d = decide(null, [p("+33899")]);
    expect(d.decision).toBe("ALLOW");
    expect(d.normalized).toBeNull();
    expect(d.spam).toBe(false);
  });

  it("AUTORISE quand la liste de préfixes est vide", () => {
    const d = decide("+33899700000", []);
    expect(d.decision).toBe("ALLOW");
  });
});
