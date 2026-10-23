import type { DeleteSelectionCommand } from "../../../application/board/delete-selection";
import type { Board } from "../../../domain/board/board";
import type { Position } from "../../../domain/board/geometry";
import type { UseCase } from "./board-gestures";

/** Éléments sélectionnés sur le canevas (lasso, `Maj` + clic), par nature. */
export interface BoardSelection {
  readonly stickyIds: readonly string[];
  readonly frameIds: readonly string[];
  readonly linkIds: readonly string[];
}

interface Selectable {
  readonly id: string;
  readonly selected?: boolean | undefined;
}

export function selectionOf(
  nodes: readonly (Selectable & { readonly type?: string | undefined })[],
  edges: readonly Selectable[],
): BoardSelection {
  const selectedNodes = nodes.filter((node) => node.selected === true);
  return {
    stickyIds: selectedNodes.filter((node) => node.type === "sticky").map((node) => node.id),
    frameIds: selectedNodes.filter((node) => node.type === "frame").map((node) => node.id),
    linkIds: edges.filter((edge) => edge.selected === true).map((edge) => edge.id),
  };
}

/**
 * `Suppr` (FR-041) : la sélection encore présente au tableau, en un seul appel (une étape d'annulation).
 * Renvoie faux s'il n'y avait rien à supprimer : la touche est alors laissée au navigateur.
 */
export function deleteSelected(
  deps: { readonly board: Board; readonly deleteSelection: UseCase<DeleteSelectionCommand> },
  selection: BoardSelection,
): boolean {
  const { board } = deps;
  const stickyIds = selection.stickyIds.filter((id) => board.sticky(id) !== undefined);
  const linkIds = selection.linkIds.filter((id) => board.link(id) !== undefined);
  const frameIds = selection.frameIds.filter((id) => board.frames.some((f) => f.id === id));
  if (stickyIds.length === 0 && linkIds.length === 0 && frameIds.length === 0) return false;
  deps.deleteSelection.execute({ stickyIds, linkIds, frameIds });
  return true;
}

/** Sélectionne exactement `ids` (ex. les copies après `Ctrl+D` ou `Ctrl+V`) ; un élément inchangé est réutilisé. */
export function selectOnly<T extends Selectable>(items: readonly T[], ids: ReadonlySet<string>): T[] {
  return items.map((item) => {
    const selected = ids.has(item.id);
    return (item.selected ?? false) === selected ? item : { ...item, selected };
  });
}

/** Point de collage à l'écran (FR-043) : le dernier pointeur connu sur le canevas, sinon le centre de la vue. */
export function pastePoint(
  pointer: Position | undefined,
  pane: { readonly left: number; readonly top: number; readonly width: number; readonly height: number },
): Position {
  return pointer ?? { x: pane.left + pane.width / 2, y: pane.top + pane.height / 2 };
}
