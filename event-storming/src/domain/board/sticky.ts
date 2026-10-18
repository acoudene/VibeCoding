import type { Position } from "./geometry";
import type { StickyKind } from "./sticky-kind";

/** Taille fixe de tous les post-its (FR-017). */
export const STICKY_SIZE = { width: 160, height: 160 } as const;

/** Post-it typé ; `position` est son coin haut-gauche ; `identifier` absent = sans identifiant. */
export interface Sticky {
  readonly id: string;
  readonly kind: StickyKind;
  readonly label: string;
  readonly identifier?: string;
  readonly position: Position;
  readonly notes: string;
}

/** Données d'un nouveau post-it ; texte et notes vides par défaut. */
export interface StickyDraft {
  readonly kind: StickyKind;
  readonly position: Position;
  readonly label?: string;
  readonly identifier?: string;
  readonly notes?: string;
}

/** Modification partielle d'un post-it ; un `identifier` vide retire l'identifiant. */
export interface StickyPatch {
  readonly label?: string;
  readonly identifier?: string;
  readonly notes?: string;
  readonly kind?: StickyKind;
}

export function stickyCenter(sticky: Pick<Sticky, "position">): Position {
  return { x: sticky.position.x + STICKY_SIZE.width / 2, y: sticky.position.y + STICKY_SIZE.height / 2 };
}

/** Construit un post-it ; un identifiant vide n'est pas conservé. */
export function makeSticky(fields: {
  readonly id: string;
  readonly kind: StickyKind;
  readonly label: string;
  readonly identifier?: string | undefined;
  readonly position: Position;
  readonly notes: string;
}): Sticky {
  const { identifier, ...rest } = fields;
  return identifier === undefined || identifier === "" ? rest : { ...rest, identifier };
}
