import { NodeResizer, type NodeProps } from "@xyflow/react";
import { memo, useRef } from "react";
import { useFrameEditing } from "./frame-editing";
import { FRAME_DRAG_HANDLE, type FrameNode } from "./frame-nodes";

/** Taille minimale d'un cadre au redimensionnement (px du tableau) : la barre de titre reste lisible. */
const MIN_FRAME_SIZE = 80;

/**
 * Cadre de contexte borné (FR-030 à FR-032) : seule sa barre de titre capte le pointeur (déplacement, double-clic
 * pour renommer) ; le fond laisse passer les clics vers le tableau (poser un post-it, lasso). Poignées de
 * redimensionnement quand il est sélectionné.
 */
export const FrameNodeView = memo(function FrameNodeView({ id, data, selected }: NodeProps<FrameNode>) {
  const { resize } = useFrameEditing();
  return (
    <div className="frame-node">
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_FRAME_SIZE}
        minHeight={MIN_FRAME_SIZE}
        onResizeEnd={(_event, params) => resize(id, { x: params.x, y: params.y, width: params.width, height: params.height })}
      />
      <div className={FRAME_DRAG_HANDLE}>
        {data.editing ? <FrameNameEditor id={id} initialName={data.name} /> : <span className="frame-node__name">{data.name}</span>}
      </div>
    </div>
  );
});

/** Entrée ou clic ailleurs : enregistre ; Échap : annule. */
function FrameNameEditor({ id, initialName }: { id: string; initialName: string }) {
  const { finishRenaming } = useFrameEditing();
  const cancelled = useRef(false);
  return (
    <input
      className="frame-node__name-editor nodrag nopan"
      aria-label="Nom du cadre"
      autoFocus
      defaultValue={initialName}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={(event) => finishRenaming(id, cancelled.current ? undefined : event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          cancelled.current = true;
          event.currentTarget.blur();
        }
      }}
    />
  );
}
