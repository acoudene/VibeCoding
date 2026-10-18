import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ReactFlow,
  useReactFlow,
  type NodeChange,
  type OnNodeDrag,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import type { StickyKind } from "../../../domain/board/sticky-kind";
import { useBoard } from "../hooks/use-board";
import { useServices } from "../services";
import { StickyEditingContext, type StickyEditing } from "./sticky-editing";
import { syncStickyNodes, type StickyNode } from "./sticky-nodes";
import { stickyPositionCenteredOn } from "./sticky-placement";
import { StickyNodeView } from "./StickyNodeView";

/** Hors du composant : xyflow exige une référence stable. */
const NODE_TYPES = { sticky: StickyNodeView };

export interface BoardCanvasProps {
  /** Type choisi dans la palette ; sans type actif, un clic sur le fond ne pose rien. */
  readonly activeKind: StickyKind | undefined;
  readonly onStickyPlaced: () => void;
}

/**
 * Canevas xyflow du tableau ouvert. Le tableau fait foi : chaque geste passe par un cas d'usage, puis les nœuds
 * sont recalculés depuis le tableau ; xyflow ne garde que l'état de vue (sélection, glissement en cours).
 */
export function BoardCanvas({ activeKind, onStickyPlaced }: BoardCanvasProps) {
  const board = useBoard();
  const { placeSticky, editSticky, moveSticky } = useServices();
  const { screenToFlowPosition } = useReactFlow();
  const [editingId, setEditingId] = useState<string | undefined>();
  const [nodes, setNodes] = useState<StickyNode[]>(() => syncStickyNodes([], board));

  useEffect(() => setNodes((previous) => syncStickyNodes(previous, board, editingId)), [board, editingId]);

  const onNodesChange = useCallback(
    (changes: NodeChange<StickyNode>[]) => setNodes((previous) => applyNodeChanges(changes, previous)),
    [],
  );

  const editing = useMemo<StickyEditing>(
    () => ({
      finishEditing(id, label) {
        editSticky.execute({ id, label });
        setEditingId((current) => (current === id ? undefined : current));
      },
    }),
    [editSticky],
  );

  function placeOnPane(event: MouseEvent) {
    if (activeKind === undefined) return;
    const at = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const { id } = placeSticky.execute({ kind: activeKind, position: stickyPositionCenteredOn(at) });
    setEditingId(id);
    onStickyPlaced();
  }

  // Un seul enregistrement par glissement, à la fin (pas à chaque image).
  const moveDragged: OnNodeDrag<StickyNode> = (_event, _node, dragged) => {
    for (const node of dragged) moveSticky.execute({ id: node.id, to: node.position });
  };

  return (
    <StickyEditingContext.Provider value={editing}>
      <ReactFlow<StickyNode>
        className={activeKind === undefined ? "board-canvas" : "board-canvas board-canvas--placing"}
        nodes={nodes}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onPaneClick={placeOnPane}
        onNodeDoubleClick={(_event, node) => setEditingId(node.id)}
        onNodeDragStop={moveDragged}
        deleteKeyCode={null}
        zoomOnDoubleClick={false}
        nodesConnectable={false}
        onlyRenderVisibleElements
      >
        <Background variant={BackgroundVariant.Lines} gap={40} />
      </ReactFlow>
    </StickyEditingContext.Provider>
  );
}
