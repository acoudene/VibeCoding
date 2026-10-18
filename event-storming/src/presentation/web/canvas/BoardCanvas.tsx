import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ConnectionMode,
  Panel,
  ReactFlow,
  useReactFlow,
  type EdgeChange,
  type NodeChange,
  type OnConnect,
  type OnConnectEnd,
  type OnNodeDrag,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import type { Rect } from "../../../domain/board/geometry";
import type { StickyKind } from "../../../domain/board/sticky-kind";
import { useBoard } from "../hooks/use-board";
import { SelectionPanel } from "../panels/SelectionPanel";
import { selectedElement } from "../panels/selection";
import { useServices } from "../services";
import { commitDrag, connectStickies, editExistingSticky, renameFrame } from "./board-gestures";
import { FloatingEdgeView } from "./FloatingEdgeView";
import { FrameDrawingLayer } from "./FrameDrawingLayer";
import { FrameEditingContext, type FrameEditing } from "./frame-editing";
import { memberPositionsDuringDrag, syncFrameNodes, type FrameNode } from "./frame-nodes";
import { FrameNodeView } from "./FrameNodeView";
import { syncLinkEdges, type LinkEdge } from "./link-edges";
import { StickyEditingContext, type StickyEditing } from "./sticky-editing";
import { syncStickyNodes, type StickyNode } from "./sticky-nodes";
import { stickyPositionCenteredOn } from "./sticky-placement";
import { StickyNodeView } from "./StickyNodeView";

/** Hors du composant : xyflow exige des références stables. */
const NODE_TYPES = { sticky: StickyNodeView, frame: FrameNodeView };
const EDGE_TYPES = { floating: FloatingEdgeView };

type BoardNode = StickyNode | FrameNode;

const isSticky = (node: BoardNode): node is StickyNode => node.type === "sticky";
const isFrame = (node: BoardNode): node is FrameNode => node.type === "frame";

export interface BoardCanvasProps {
  /** Type choisi dans la palette ; sans type actif, un clic sur le fond ne pose rien. */
  readonly activeKind: StickyKind | undefined;
  readonly onStickyPlaced: () => void;
  /** Outil cadre armé (`F`) : le prochain glissement sur le tableau dessine un cadre. */
  readonly frameToolActive: boolean;
  /** Le glissement de l'outil cadre est terminé (cadre dessiné ou simple clic). */
  readonly onFrameToolDone: () => void;
}

/**
 * Canevas xyflow du tableau ouvert. Le tableau fait foi : chaque geste passe par un cas d'usage, puis les nœuds
 * et les arêtes sont recalculés depuis le tableau ; xyflow ne garde que l'état de vue (sélection, glissement en cours).
 * Cadres sous les liens, liens sous les post-its (`zIndexMode="manual"`, voir `layers.ts`).
 */
export function BoardCanvas({ activeKind, onStickyPlaced, frameToolActive, onFrameToolDone }: BoardCanvasProps) {
  const board = useBoard();
  const { placeSticky, editSticky, moveSticky, linkStickies, drawFrame, editFrame, currentBoard } = useServices();
  const { screenToFlowPosition } = useReactFlow();
  const [editingStickyId, setEditingStickyId] = useState<string | undefined>();
  const [editingFrameId, setEditingFrameId] = useState<string | undefined>();
  const [nodes, setNodes] = useState<BoardNode[]>(() => [...syncFrameNodes([], board), ...syncStickyNodes([], board)]);
  const [edges, setEdges] = useState<LinkEdge[]>(() => syncLinkEdges([], board));

  useEffect(
    () =>
      setNodes((previous) => [
        ...syncFrameNodes(previous.filter(isFrame), board, editingFrameId),
        ...syncStickyNodes(previous.filter(isSticky), board, editingStickyId),
      ]),
    [board, editingStickyId, editingFrameId],
  );
  useEffect(() => setEdges((previous) => syncLinkEdges(previous, board)), [board]);

  const onNodesChange = useCallback(
    (changes: NodeChange<BoardNode>[]) => setNodes((previous) => applyNodeChanges(changes, previous)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<LinkEdge>[]) => setEdges((previous) => applyEdgeChanges(changes, previous)),
    [],
  );

  const stickyEditing = useMemo<StickyEditing>(
    () => ({
      finishEditing(id, label) {
        editExistingSticky({ board: currentBoard(), editSticky }, { id, label });
        setEditingStickyId((current) => (current === id ? undefined : current));
      },
    }),
    [currentBoard, editSticky],
  );

  const frameEditing = useMemo<FrameEditing>(
    () => ({
      finishRenaming(id, name) {
        if (name !== undefined) renameFrame({ board: currentBoard(), editFrame }, id, name);
        setEditingFrameId((current) => (current === id ? undefined : current));
      },
      resize(id, rect) {
        if (currentBoard().frames.some((f) => f.id === id)) editFrame.execute({ frameId: id, action: "resize", rect });
      },
    }),
    [currentBoard, editFrame],
  );

  function placeOnPane(event: MouseEvent) {
    if (activeKind === undefined) return;
    const at = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const { id } = placeSticky.execute({ kind: activeKind, position: stickyPositionCenteredOn(at) });
    setEditingStickyId(id);
    onStickyPlaced();
  }

  function drawFrameAt(rect: Rect) {
    const { id } = drawFrame.execute({ rect });
    setEditingFrameId(id);
    onFrameToolDone();
  }

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

  // Un seul enregistrement par glissement, à la fin (pas à chaque image).
  const commitDragged: OnNodeDrag<BoardNode> = (_event, _node, dragged) => {
    commitDrag({ board: currentBoard(), moveSticky, editFrame }, dragged);
  };

  const selection = selectedElement(nodes, edges);
  const classNames = ["board-canvas"];
  if (activeKind !== undefined) classNames.push("board-canvas--placing");

  return (
    <StickyEditingContext.Provider value={stickyEditing}>
      <FrameEditingContext.Provider value={frameEditing}>
        <ReactFlow<BoardNode, LinkEdge>
          className={classNames.join(" ")}
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onPaneClick={placeOnPane}
          onNodeDoubleClick={(_event, node) =>
            node.type === "frame" ? setEditingFrameId(node.id) : setEditingStickyId(node.id)
          }
          onNodeDrag={followFrame}
          onNodeDragStop={commitDragged}
          onConnect={connect}
          onConnectEnd={connectOnNodeBody}
          isValidConnection={(connection) => connection.source !== connection.target}
          connectionMode={ConnectionMode.Loose}
          zIndexMode="manual"
          deleteKeyCode={null}
          zoomOnDoubleClick={false}
          onlyRenderVisibleElements
        >
          <Background variant={BackgroundVariant.Lines} gap={40} />
          {selection !== undefined && (
            <Panel position="top-right">
              <SelectionPanel selection={selection} onRenameFrame={setEditingFrameId} />
            </Panel>
          )}
        </ReactFlow>
        {frameToolActive && <FrameDrawingLayer onDraw={drawFrameAt} onCancel={onFrameToolDone} />}
      </FrameEditingContext.Provider>
    </StickyEditingContext.Provider>
  );
}
