import { Panel, useReactFlow, useViewport } from "@xyflow/react";
import { FIT_VIEW_OPTIONS, zoomPercent } from "./zoom";

const ANIMATION = { duration: 200 };

/** Zoom par paliers (×1,2), pourcentage affiché, « Ajuster à l'écran » (FR-051). */
export function ZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();
  return (
    <Panel position="bottom-left" className="zoom-controls" aria-label="Zoom">
      <button type="button" aria-label="Zoom arrière" title="Zoom arrière" onClick={() => void zoomOut(ANIMATION)}>
        −
      </button>
      <output className="zoom-controls__percent" aria-label="Niveau de zoom">
        {zoomPercent(zoom)}
      </output>
      <button type="button" aria-label="Zoom avant" title="Zoom avant" onClick={() => void zoomIn(ANIMATION)}>
        +
      </button>
      <button type="button" onClick={() => void fitView({ ...FIT_VIEW_OPTIONS, ...ANIMATION })}>
        Ajuster à l'écran
      </button>
    </Panel>
  );
}
