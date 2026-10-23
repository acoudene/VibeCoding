import { useBoard } from "../hooks/use-board";
import { useServices } from "../services";

/** Annuler / Rétablir (FR-044), désactivés quand il n'y a rien à annuler ou rétablir ; relus à chaque modification. */
export function HistoryButtons() {
  useBoard(); // nouveau rendu à chaque modification du tableau (action, annulation, rétablissement)
  const { undo, redo, canUndo, canRedo } = useServices();
  return (
    <div className="history-buttons">
      <button type="button" aria-keyshortcuts="Control+Z" disabled={!canUndo()} onClick={() => undo.execute()}>
        Annuler
      </button>
      <button type="button" aria-keyshortcuts="Control+Y Control+Shift+Z" disabled={!canRedo()} onClick={() => redo.execute()}>
        Rétablir
      </button>
    </div>
  );
}
