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
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { Board } from "../../../domain/board/board";
import type { Rect } from "../../../domain/board/geometry";
import type { StickyKind } from "../../../domain/board/sticky-kind";
import { useBoard } from "../hooks/use-board";
import { useViewportMemory } from "../hooks/use-viewport-memory";
import { SelectionPanel } from "../panels/SelectionPanel";
import { selectedElement } from "../panels/selection";
import { useServices } from "../services";
import { editExistingSticky, renameFrame } from "./board-gestures";
import { isFrame, isSticky, type BoardNode } from "./board-node";
import { FloatingEdgeView } from "./FloatingEdgeView";
import { FrameDrawingLayer } from "./FrameDrawingLayer";
import { FrameEditingContext, type FrameEditing } from "./frame-editing";
import { syncFrameNodes } from "./frame-nodes";
import { FrameNodeView } from "./FrameNodeView";
import { syncLinkEdges, type LinkEdge } from "./link-edges";
import { selectOnly } from "./selection-gestures";
import { StickyEditingContext, type StickyEditing } from "./sticky-editing";
import { syncStickyNodes } from "./sticky-nodes";
import { stickyPositionCenteredOn } from "./sticky-placement";
import { StickyNodeView } from "./StickyNodeView";
import { useCanvasGestures } from "./use-canvas-gestures";
import { ZoomControls } from "./ZoomControls";

/** Hors du composant : xyflow exige des références stables. */
const NODE_TYPES = { sticky: StickyNodeView, frame: FrameNodeView };
const EDGE_TYPES = { floating: FloatingEdgeView };
/** Glisser sur le fond trace un lasso ; le bouton du milieu (ou `Espace` maintenu) déplace la vue (FR-040, FR-050). */
const PAN_ON_DRAG = [1];
/** Assez bas pour « Ajuster à l'écran » un grand tableau, assez haut pour lire un post-it de près. */
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;

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
  const { placeSticky, editSticky, drawFrame, editFrame, currentBoard } = useServices();
  const { screenToFlowPosition } = useReactFlow();
  const { opening, onMoveEnd } = useViewportMemory(board.id, board.stickies.length === 0 && board.frames.length === 0);
  const paneRef = useRef<HTMLDivElement>(null);
  const [editingStickyId, setEditingStickyId] = useState<string | undefined>();
  const [editingFrameId, setEditingFrameId] = useState<string | undefined>();
  /** Post-its créés par `Ctrl+D` / `Ctrl+V`, à sélectionner seuls dès qu'ils figurent dans le tableau affiché. */
  const [createdToSelect, setCreatedToSelect] = useState<readonly string[] | undefined>();
  const [nodes, setNodes] = useState<BoardNode[]>(() => [...syncFrameNodes([], board), ...syncStickyNodes([], board)]);
  const [edges, setEdges] = useState<LinkEdge[]>(() => syncLinkEdges([], board));

  const syncNodes = useCallback(
    (shown: Board) =>
      setNodes((previous) => [
        ...syncFrameNodes(previous.filter(isFrame), shown, editingFrameId),
        ...syncStickyNodes(previous.filter(isSticky), shown, editingStickyId),
      ]),
    [editingStickyId, editingFrameId],
  );

  useEffect(() => {
    syncNodes(board);
    setEdges((previous) => syncLinkEdges(previous, board));
    if (createdToSelect === undefined || !createdToSelect.every((id) => board.sticky(id) !== undefined)) return;
    const selected = new Set(createdToSelect);
    setNodes((previous) => selectOnly(previous, selected));
    setEdges((previous) => selectOnly(previous, selected));
    setCreatedToSelect(undefined);
  }, [board, syncNodes, createdToSelect]);

  const onNodesChange = useCallback(
    (changes: NodeChange<BoardNode>[]) => setNodes((previous) => applyNodeChanges(changes, previous)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<LinkEdge>[]) => setEdges((previous) => applyEdgeChanges(changes, previous)),
    [],
  );

  const gestures = useCanvasGestures({
    nodes,
    edges,
    setNodes,
    resyncNodes: () => syncNodes(currentBoard()),
    selectCreated: (ids) => {
      if (ids.length > 0) setCreatedToSelect(ids);
    },
    paneRef,
  });

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

  const selection = selectedElement(nodes, edges);
  const classNames = ["board-canvas"];
  if (activeKind !== undefined) classNames.push("board-canvas--placing");

  return (
    <StickyEditingContext.Provider value={stickyEditing}>
      <FrameEditingContext.Provider value={frameEditing}>
        <ReactFlow<BoardNode, LinkEdge>
          ref={paneRef}
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
          onNodeDrag={gestures.followFrame}
          onNodeDragStop={gestures.commitDragged}
          onConnect={gestures.connect}
          onConnectEnd={gestures.connectOnNodeBody}
          onPointerMove={gestures.trackPointer}
          onMoveEnd={onMoveEnd}
          isValidConnection={(connection) => connection.source !== connection.target}
          connectionMode={ConnectionMode.Loose}
          zIndexMode="manual"
          {...opening}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          selectionOnDrag
          panOnDrag={PAN_ON_DRAG}
          panActivationKeyCode="Space"
          multiSelectionKeyCode="Shift"
          zoomOnScroll
          panOnScroll={false}
          deleteKeyCode={null}
          zoomOnDoubleClick={false}
          onlyRenderVisibleElements
        >
          <Background variant={BackgroundVariant.Lines} gap={40} />
          <ZoomControls />
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
