import { STICKY_KINDS, stickyColor, type StickyColor, type StickyKind } from "../../domain/board/sticky-kind";

/** Noms français des types affichés par la palette et la légende ; le violet est nommé « Policy » (ADR-0016). */
export const STICKY_KIND_NAMES: Record<StickyKind, string> = {
  DomainEvent: "Événement",
  Command: "Commande",
  Actor: "Acteur",
  Aggregate: "Agrégat",
  Policy: "Policy",
  ReadModel: "Read model",
  ExternalSystem: "Système externe",
  Hotspot: "Hotspot",
  Rule: "Règle",
};

export interface StickyKindItem {
  readonly kind: StickyKind;
  readonly name: string;
  readonly color: StickyColor;
}

/** Les 9 types dans l'ordre du domaine, avec leur nom et leur couleur dérivée (FR-010, FR-011, FR-016). */
export function stickyKindItems(): StickyKindItem[] {
  return STICKY_KINDS.map((kind) => ({ kind, name: STICKY_KIND_NAMES[kind], color: stickyColor(kind) }));
}

/** Propriété CSS de la couleur, définie dans `sticky-colors.css` (ex. `paleYellow` → `--sticky-pale-yellow`). */
export function stickyColorVar(color: StickyColor): string {
  return `var(--sticky-${color.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)})`;
}
