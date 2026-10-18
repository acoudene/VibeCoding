import type { Node } from "@xyflow/react";
import type { Board } from "../../../domain/board/board";
import { STICKY_SIZE, type Sticky } from "../../../domain/board/sticky";
import { stickyColor, type StickyColor, type StickyKind } from "../../../domain/board/sticky-kind";
import { STICKY_KIND_NAMES } from "../sticky-kinds";

export type StickyNodeData = {
  readonly kind: StickyKind;
  readonly kindName: string;
  readonly color: StickyColor;
  readonly label: string;
  readonly editing: boolean;
};

export type StickyNode = Node<StickyNodeData, "sticky">;

/**
 * Nœuds xyflow des post-its, dans l'ordre du tableau. Le tableau fait foi pour le contenu et la position ;
 * l'état propre à la vue (sélection, mesures) des nœuds existants est conservé.
 * Le post-it en cours d'édition est le seul sélectionné.
 */
export function syncStickyNodes(previous: readonly StickyNode[], board: Board, editingId?: string): StickyNode[] {
  const previousById = new Map(previous.map((node) => [node.id, node]));
  return board.stickies.map((sticky) => {
    const node = previousById.get(sticky.id);
    const selected = editingId === undefined ? (node?.selected ?? false) : sticky.id === editingId;
    return {
      ...node,
      id: sticky.id,
      type: "sticky",
      position: sticky.position,
      width: STICKY_SIZE.width,
      height: STICKY_SIZE.height,
      selected,
      ariaLabel: describe(sticky),
      data: {
        kind: sticky.kind,
        kindName: STICKY_KIND_NAMES[sticky.kind],
        color: stickyColor(sticky.kind),
        label: sticky.label,
        editing: sticky.id === editingId,
      },
    };
  });
}

function describe(sticky: Sticky): string {
  const name = STICKY_KIND_NAMES[sticky.kind];
  return sticky.label.trim() === "" ? `${name} (vide)` : `${name} : ${sticky.label}`;
}
