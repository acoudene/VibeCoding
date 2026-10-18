import type { StickyKind } from "./sticky-kind";

export type LinkClassification = "inGrammar" | "outOfGrammar";

/** Grammaire « design level » (docs/domain/README.md), dans l'ordre du document. */
const GRAMMAR: readonly (readonly [StickyKind, StickyKind])[] = [
  ["Actor", "Command"],
  ["Command", "Aggregate"],
  ["Aggregate", "DomainEvent"],
  ["DomainEvent", "Policy"],
  ["Policy", "Command"],
  ["DomainEvent", "ReadModel"],
  ["ReadModel", "Actor"],
  ["ExternalSystem", "DomainEvent"],
  ["Command", "ExternalSystem"],
  ["Rule", "Aggregate"],
];

export function classifyLink(source: StickyKind, target: StickyKind): LinkClassification {
  return GRAMMAR.some(([s, t]) => s === source && t === target) ? "inGrammar" : "outOfGrammar";
}

/** Types cibles autorisés depuis `sourceKind`, dans l'ordre de la grammaire. */
export function expectedTargets(sourceKind: StickyKind): StickyKind[] {
  return GRAMMAR.filter(([s]) => s === sourceKind).map(([, t]) => t);
}

/** Ex. « DomainEvent → Policy, DomainEvent → ReadModel » (info-bulle FR-022). */
export function describeExpectedLinks(sourceKind: StickyKind): string {
  return expectedTargets(sourceKind)
    .map((t) => `${sourceKind} → ${t}`)
    .join(", ");
}
