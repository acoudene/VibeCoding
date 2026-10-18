import type { Node } from "@xyflow/react";
import type { Board } from "../../../domain/board/board";
import { frameOf, type Frame } from "../../../domain/board/frame";
import type { Position } from "../../../domain/board/geometry";
import { stickyCenter } from "../../../domain/board/sticky";
import { FRAME_Z_INDEX } from "./layers";

export type FrameNodeData = {
  readonly name: string;
  readonly editing: boolean;
};

export type FrameNode = Node<FrameNodeData, "frame">;

/** Classe de la barre de titre : seule poignée de déplacement du cadre (le reste laisse passer les clics). */
export const FRAME_DRAG_HANDLE = "frame-node__title";

/**
 * Le fond du cadre laisse passer les clics vers le tableau (poser un post-it, lasso) ; seuls le titre et les poignées
 * les captent (`board-editor.css`). Style en ligne car xyflow fixe `pointer-events` en ligne sur chaque nœud.
 */
const FRAME_NODE_STYLE = { pointerEvents: "none" } as const;

/**
 * Nœuds xyflow des cadres, dans l'ordre du tableau, placés sous les liens et les post-its. Ce sont des nœuds
 * ordinaires (sans `parentId`) : l'appartenance d'un post-it reste calculée par le domaine (`frameOf`).
 * Le tableau fait foi pour la position et la taille ; l'état propre à la vue (sélection, mesures) est conservé ;
 * un nœud inchangé est réutilisé.
 */
export function syncFrameNodes(previous: readonly FrameNode[], board: Board, editingId?: string): FrameNode[] {
  const previousById = new Map(previous.map((node) => [node.id, node]));
  return board.frames.map((frame) => {
    const node = previousById.get(frame.id);
    const editing = frame.id === editingId;
    if (node !== undefined && matches(node, frame, editing)) return node;
    return {
      ...node,
      id: frame.id,
      type: "frame",
      position: { x: frame.rect.x, y: frame.rect.y },
      width: frame.rect.width,
      height: frame.rect.height,
      zIndex: FRAME_Z_INDEX,
      dragHandle: `.${FRAME_DRAG_HANDLE}`,
      style: FRAME_NODE_STYLE,
      selected: node?.selected ?? false,
      ariaLabel: `Cadre : ${frame.name}`,
      data: { name: frame.name, editing },
    };
  });
}

function matches(node: FrameNode, frame: Frame, editing: boolean): boolean {
  return (
    node.data.name === frame.name &&
    node.data.editing === editing &&
    node.position.x === frame.rect.x &&
    node.position.y === frame.rect.y &&
    node.width === frame.rect.width &&
    node.height === frame.rect.height
  );
}

/**
 * Positions affichées, pendant le glissement d'un cadre arrivé en `framePosition`, des post-its qui lui
 * appartiennent (même règle que le domaine, `frameOf`) : ils suivent le cadre à l'écran avant l'enregistrement.
 */
export function memberPositionsDuringDrag(board: Board, frameId: string, framePosition: Position): Map<string, Position> {
  const frame = board.frames.find((f) => f.id === frameId);
  const positions = new Map<string, Position>();
  if (frame === undefined) return positions;
  const dx = framePosition.x - frame.rect.x;
  const dy = framePosition.y - frame.rect.y;
  for (const sticky of board.stickies) {
    if (frameOf(stickyCenter(sticky), board.frames)?.id !== frameId) continue;
    positions.set(sticky.id, { x: sticky.position.x + dx, y: sticky.position.y + dy });
  }
  return positions;
}
