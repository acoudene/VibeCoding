import "@xyflow/react/dist/style.css";
import { ReactFlowProvider } from "@xyflow/react";
import { useEffect, useState } from "react";
import type { StickyKind } from "../../../domain/board/sticky-kind";
import { Legend } from "../legend/Legend";
import "../sticky-colors.css";
import { BoardCanvas } from "./BoardCanvas";
import "./board-editor.css";
import { Palette } from "./Palette";

/** Vrai si la touche est tapée dans un champ de saisie : elle ne doit alors déclencher aucun outil. */
function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

/** Espace de travail du tableau ouvert : palette des types et outil cadre, canevas et légende. */
export function BoardEditor() {
  const [activeKind, setActiveKind] = useState<StickyKind | undefined>();
  const [frameToolActive, setFrameToolActive] = useState(false);

  // `F` arme l'outil cadre (FR-030), Échap le désarme ; jamais pendant une saisie de texte.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTyping(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "f" || event.key === "F") {
        setActiveKind(undefined);
        setFrameToolActive(true);
      } else if (event.key === "Escape") {
        setFrameToolActive(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <ReactFlowProvider>
      <div className="board-editor">
        <div className="board-editor__tools">
          <Palette
            activeKind={activeKind}
            onSelect={(kind) => {
              setActiveKind(kind);
              setFrameToolActive(false);
            }}
          />
          <button
            type="button"
            className="palette__button"
            aria-pressed={frameToolActive}
            aria-keyshortcuts="F"
            onClick={() => {
              setActiveKind(undefined);
              setFrameToolActive((active) => !active);
            }}
          >
            <span className="swatch swatch--frame" aria-hidden="true" />
            Cadre (F)
          </button>
        </div>
        <div className="board-editor__canvas">
          {/* Comme dans Miro, l'outil post-it se désactive après une pose : un clic pour finir l'édition ne repose rien. */}
          <BoardCanvas
            activeKind={activeKind}
            onStickyPlaced={() => setActiveKind(undefined)}
            frameToolActive={frameToolActive}
            onFrameToolDone={() => setFrameToolActive(false)}
          />
          <Legend />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
