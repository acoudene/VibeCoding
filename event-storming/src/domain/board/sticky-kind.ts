/** Types de post-it Event Storming (niveau design) — voir docs/domain/README.md. */
export const STICKY_KINDS = [
  "DomainEvent",
  "Command",
  "Actor",
  "Aggregate",
  "Policy",
  "ReadModel",
  "ExternalSystem",
  "Hotspot",
  "Rule",
] as const;

export type StickyKind = (typeof STICKY_KINDS)[number];

export type StickyColor = "orange" | "blue" | "paleYellow" | "yellow" | "purple" | "green" | "pink" | "red" | "grey";

const COLORS: Record<StickyKind, StickyColor> = {
  DomainEvent: "orange",
  Command: "blue",
  Actor: "paleYellow",
  Aggregate: "yellow",
  Policy: "purple",
  ReadModel: "green",
  ExternalSystem: "pink",
  Hotspot: "red",
  Rule: "grey",
};

/** Le type d'un post-it détermine sa couleur ; la couleur n'est jamais saisie. */
export function stickyColor(kind: StickyKind): StickyColor {
  return COLORS[kind];
}
