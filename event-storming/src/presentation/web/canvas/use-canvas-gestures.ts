import { useReactFlow, type OnConnect, type OnConnectEnd, type OnNodeDrag } from "@xyflow/react";
import { useRef, type Dispatch, type PointerEvent, type RefObject, type SetStateAction } from "react";
import type { BoardFragment } from "../../../domain/board/board";
import type { Position } from "../../../domain/board/geometry";
import { useBoardShortcuts } from "../hooks/use-board-shortcuts";
import { useServices } from "../services";
import { commitDrag, connectStickies } from "./board-gestures";
import { isFrame, type BoardNode } from "./board-node";
import { memberPositionsDuringDrag } from "./frame-nodes";
import type { LinkEdge } from "./link-edges";
import { deleteSelected, pastePoint, selectionOf } from "./selection-gestures";

export interface CanvasGesturesOptions {
  readonly nodes: readonly BoardNode[];
  readonly edges: readonly LinkEdge[];
  readonly setNodes: Dispatch<SetStateAction<BoardNode[]>>;
  /** Recalcule les nœuds depuis le tableau (la vue s'en est écartée sans que le tableau change). */
  readonly resyncNodes: () => void;
  /** Sélectionne exactement ces post-its dès qu'ils apparaissent sur le canevas (copies de `Ctrl+D`, `Ctrl+V`). */
  readonly selectCreated: (ids: readonly string[]) => void;
  /** Conteneur du canevas : son centre sert de point de collage quand le pointeur est inconnu. */
  readonly paneRef: RefObject<HTMLDivElement | null>;
}

export interface CanvasGestures {
  readonly connect: OnConnect;
  readonly connectOnNodeBody: OnConnectEnd;
  readonly followFrame: OnNodeDrag<BoardNode>;
  readonly commitDragged: OnNodeDrag<BoardNode>;
  /** Mémorise la position du pointeur sur le canevas, pour coller au pointeur (FR-043). */
  readonly trackPointer: (event: PointerEvent) => void;
}

/**
 * Gestes du canevas traduits en cas d'usage : liens (FR-020), glissement de post-its et de cadres (FR-014, FR-031),
 * raccourcis clavier de la sélection et de l'historique (FR-041 à FR-044).
 */
export function useCanvasGestures({ nodes, edges, setNodes, resyncNodes, selectCreated, paneRef }: CanvasGesturesOptions): CanvasGestures {
  const services = useServices();
  const { currentBoard, linkStickies, moveElements } = services;
  const { screenToFlowPosition } = useReactFlow();
  const pointer = useRef<Position | undefined>(undefined);
  const clipboard = useRef<BoardFragment | undefined>(undefined);

  const connect: OnConnect = (connection) => {
    connectStickies({ board: currentBoard(), linkStickies }, connection.source, connection.target);
  };

  // Lâcher sur le corps d'un post-it (et non sur un de ses points) le relie aussi, comme dans Miro.
  const connectOnNodeBody: OnConnectEnd = (event, connection) => {
    if (connection.fromNode === null || connection.toHandle !== null) return;
    const point = "changedTouches" in event ? event.changedTouches[0] : event;
    if (point === undefined) return;
    const targetId = document
      .elementFromPoint(point.clientX, point.clientY)
      ?.closest(".react-flow__node")
      ?.getAttribute("data-id");
    if (targetId !== null && targetId !== undefined) {
      connectStickies({ board: currentBoard(), linkStickies }, connection.fromNode.id, targetId);
    }
  };

  // Les membres d'un cadre glissé le suivent à l'écran ; le domaine les déplace à l'enregistrement.
  const followFrame: OnNodeDrag<BoardNode> = (_event, _node, dragged) => {
    const frames = dragged.filter(isFrame);
    if (frames.length === 0) return;
    const current = currentBoard();
    const moved = new Map(frames.flatMap((frame) => [...memberPositionsDuringDrag(current, frame.id, frame.position)]));
    const draggedIds = new Set(dragged.map((node) => node.id));
    setNodes((previous) =>
      previous.map((node) => {
        const position = draggedIds.has(node.id) ? undefined : moved.get(node.id);
        return position === undefined ? node : { ...node, position };
      }),
    );
  };

  // Un seul enregistrement par glissement, à la fin (pas à chaque image), en une étape d'annulation.
  // Un élément glissé disparu entre-temps : la vue (membres suivant un cadre supprimé) revient au tableau.
  const commitDragged: OnNodeDrag<BoardNode> = (_event, _node, dragged) => {
    if (!commitDrag({ board: currentBoard(), moveElements }, dragged)) resyncNodes();
  };

  const trackPointer = (event: PointerEvent) => {
    pointer.current = { x: event.clientX, y: event.clientY };
  };

  const existingSelectedStickies = () => {
    const board = currentBoard();
    return selectionOf(nodes, edges).stickyIds.filter((id) => board.sticky(id) !== undefined);
  };

  // Chaque action renvoie vrai si elle a traité la touche. Ctrl+D, Ctrl+Z et Ctrl+Y le sont toujours sur le tableau
  // (pas de favori ni d'annulation du navigateur) ; Suppr, Ctrl+C et Ctrl+V seulement s'il y a de quoi agir.
  useBoardShortcuts({
    delete: () => deleteSelected({ board: currentBoard(), deleteSelection: services.deleteSelection }, selectionOf(nodes, edges)),
    duplicate: () => {
      const stickyIds = existingSelectedStickies();
      if (stickyIds.length > 0) selectCreated(services.duplicateSelection.execute({ stickyIds }).createdIds);
      return true;
    },
    copy: () => {
      const stickyIds = existingSelectedStickies();
      if (stickyIds.length === 0) return false;
      clipboard.current = services.copySelection.execute({ stickyIds });
      return true;
    },
    paste: () => {
      const pane = paneRef.current;
      if (clipboard.current === undefined || pane === null) return false;
      const at = screenToFlowPosition(pastePoint(pointer.current, pane.getBoundingClientRect()));
      selectCreated(services.pasteFragment.execute({ fragment: clipboard.current, at }).createdIds);
      return true;
    },
    undo: () => {
      services.undo.execute();
      return true;
    },
    redo: () => {
      services.redo.execute();
      return true;
    },
  });

  return { connect, connectOnNodeBody, followFrame, commitDragged, trackPointer };
}
