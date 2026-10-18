import "@xyflow/react/dist/style.css";
import { ReactFlowProvider } from "@xyflow/react";
import { useState } from "react";
import type { StickyKind } from "../../../domain/board/sticky-kind";
import { Legend } from "../legend/Legend";
import "../sticky-colors.css";
import { BoardCanvas } from "./BoardCanvas";
import "./board-editor.css";
import { Palette } from "./Palette";

/** Espace de travail du tableau ouvert : palette des types, canevas et légende. */
export function BoardEditor() {
  const [activeKind, setActiveKind] = useState<StickyKind | undefined>();
  return (
    <ReactFlowProvider>
      <div className="board-editor">
        <Palette activeKind={activeKind} onSelect={setActiveKind} />
        <div className="board-editor__canvas">
          {/* Comme dans Miro, l'outil post-it se désactive après une pose : un clic pour finir l'édition ne repose rien. */}
          <BoardCanvas activeKind={activeKind} onStickyPlaced={() => setActiveKind(undefined)} />
          <Legend />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
