import { useReactFlow } from "@xyflow/react";
import { useState } from "react";
import type { Position, Rect } from "../../../domain/board/geometry";
import { isFrameDrag, rectBetween } from "./frame-drawing";

export interface FrameDrawingLayerProps {
  /** Rectangle glissé, en coordonnées du tableau. */
  readonly onDraw: (rect: Rect) => void;
  /** Simple clic (glissement trop court) : rien n'est dessiné. */
  readonly onCancel: () => void;
}

interface Drag {
  /** Coin haut-gauche de la couche à l'écran, pour placer l'aperçu. */
  readonly origin: Position;
  readonly start: Position;
  readonly current: Position;
}

/**
 * Couche posée sur le canevas quand l'outil cadre est armé (`F`) : le glissement dessine l'aperçu du rectangle,
 * le relâchement crée le cadre (FR-030). Elle capte le pointeur pour que le glissement ne déplace pas la vue.
 */
export function FrameDrawingLayer({ onDraw, onCancel }: FrameDrawingLayerProps) {
  const { screenToFlowPosition } = useReactFlow();
  const [drag, setDrag] = useState<Drag | undefined>();
  const preview = drag === undefined ? undefined : rectBetween(drag.start, drag.current);
  return (
    <div
      className="frame-drawing-layer"
      title="Glisser pour dessiner un cadre"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const bounds = event.currentTarget.getBoundingClientRect();
        const point = { x: event.clientX, y: event.clientY };
        setDrag({ origin: { x: bounds.left, y: bounds.top }, start: point, current: point });
      }}
      onPointerMove={(event) => {
        if (drag !== undefined) setDrag({ ...drag, current: { x: event.clientX, y: event.clientY } });
      }}
      onPointerCancel={() => {
        // Pointeur perdu (ex. geste système) : l'aperçu disparaît, rien n'est dessiné, l'outil reste armé.
        setDrag(undefined);
      }}
      onPointerUp={(event) => {
        if (drag === undefined) return;
        setDrag(undefined);
        const end = { x: event.clientX, y: event.clientY };
        if (!isFrameDrag(rectBetween(drag.start, end))) {
          onCancel();
          return;
        }
        onDraw(rectBetween(screenToFlowPosition(drag.start), screenToFlowPosition(end)));
      }}
    >
      {drag !== undefined && preview !== undefined && (
        <div
          className="frame-drawing-layer__preview"
          style={{
            left: preview.x - drag.origin.x,
            top: preview.y - drag.origin.y,
            width: preview.width,
            height: preview.height,
          }}
        />
      )}
    </div>
  );
}
