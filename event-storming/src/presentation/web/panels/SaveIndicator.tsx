import type { SyncStatus } from "../../../application/ports/board-sync";
import "./panels.css";
import { SAVE_STATUS_LABELS } from "./save-status";

/** Indicateur d'enregistrement automatique (FR-004), lié à `BoardSync.onStatusChange` par la session du tableau. */
export function SaveIndicator({ status }: { status: SyncStatus }) {
  return (
    <p className="save-indicator" data-status={status} aria-live="polite">
      {SAVE_STATUS_LABELS[status]}
    </p>
  );
}
