import type { DeleteSelectionCommand } from "../../../application/board/delete-selection";
import type { EditFrameCommand } from "../../../application/board/edit-frame";
import type { EditLinkCommand } from "../../../application/board/edit-link";
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
 * `Suppr` (FR-041) : les post-its sélectionnés (et leurs liens, en cascade), puis les liens et les cadres sélectionnés
 * encore présents. Le tableau est relu après chaque étape : un lien déjà supprimé en cascade est ignoré.
 */
export function deleteSelected(
  deps: {
    readonly currentBoard: () => Board;
    readonly deleteSelection: UseCase<DeleteSelectionCommand>;
    readonly editLink: UseCase<EditLinkCommand>;
    readonly editFrame: UseCase<EditFrameCommand>;
  },
  selection: BoardSelection,
): void {
  const stickyIds = selection.stickyIds.filter((id) => deps.currentBoard().sticky(id) !== undefined);
  if (stickyIds.length > 0) deps.deleteSelection.execute({ stickyIds });
  for (const linkId of selection.linkIds) {
    if (deps.currentBoard().link(linkId) !== undefined) deps.editLink.execute({ linkId, action: "remove" });
  }
  for (const frameId of selection.frameIds) {
    if (deps.currentBoard().frames.some((f) => f.id === frameId)) deps.editFrame.execute({ frameId, action: "remove" });
  }
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
