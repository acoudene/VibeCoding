import type { SyncStatus } from "../../../application/ports/board-sync";

/** Libellés de l'indicateur d'enregistrement (FR-004). */
export const SAVE_STATUS_LABELS: Readonly<Record<SyncStatus, string>> = {
  saved: "Enregistré",
  saving: "Enregistrement…",
  offline: "Hors ligne",
  error: "Erreur d'enregistrement",
};
