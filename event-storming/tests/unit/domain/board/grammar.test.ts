import { describe, expect, it } from "vitest";
import { classifyLink, describeExpectedLinks, expectedTargets } from "../../../../src/domain/board/grammar";
import { STICKY_KINDS, type StickyKind } from "../../../../src/domain/board/sticky-kind";

const RULES: readonly (readonly [StickyKind, StickyKind])[] = [
  ["Actor", "Command"], ["Command", "Aggregate"], ["Aggregate", "DomainEvent"],
  ["DomainEvent", "Policy"], ["Policy", "Command"], ["DomainEvent", "ReadModel"],
  ["ReadModel", "Actor"], ["ExternalSystem", "DomainEvent"], ["Command", "ExternalSystem"],
  ["Rule", "Aggregate"],
];

describe("classifyLink", () => {
  it.each(RULES)("%s → %s est dans la grammaire", (s, t) => expect(classifyLink(s, t)).toBe("inGrammar"));

  it("tout autre couple est hors grammaire (81 - 10 = 71)", () => {
    const allowed = new Set(RULES.map(([s, t]) => `${s}>${t}`));
    let out = 0;
    for (const s of STICKY_KINDS) for (const t of STICKY_KINDS) {
      if (allowed.has(`${s}>${t}`)) continue;
      out++;
      expect(classifyLink(s, t)).toBe("outOfGrammar");
    }
    expect(out).toBe(71);
  });

  it("est orienté", () => expect(classifyLink("Command", "Actor")).toBe("outOfGrammar"));
  it("Hotspot est toujours hors grammaire", () => {
    for (const k of STICKY_KINDS) {
      expect(classifyLink("Hotspot", k)).toBe("outOfGrammar");
      expect(classifyLink(k, "Hotspot")).toBe("outOfGrammar");
    }
  });
});

describe("expectedTargets", () => {
  it("DomainEvent → Policy, ReadModel (ordre de la grammaire)", () =>
    expect(expectedTargets("DomainEvent")).toEqual(["Policy", "ReadModel"]));
  it("Command → Aggregate, ExternalSystem", () =>
    expect(expectedTargets("Command")).toEqual(["Aggregate", "ExternalSystem"]));
  it("Hotspot n'a aucune cible", () => expect(expectedTargets("Hotspot")).toEqual([]));
  it("est cohérent avec classifyLink", () => {
    for (const s of STICKY_KINDS) for (const t of STICKY_KINDS) {
      expect(expectedTargets(s).includes(t)).toBe(classifyLink(s, t) === "inGrammar");
    }
  });
});

describe("describeExpectedLinks", () => {
  it("formate les liens attendus", () =>
    expect(describeExpectedLinks("DomainEvent")).toBe("DomainEvent → Policy, DomainEvent → ReadModel"));
  it("renvoie une chaîne vide sans cible", () => expect(describeExpectedLinks("Hotspot")).toBe(""));
});
