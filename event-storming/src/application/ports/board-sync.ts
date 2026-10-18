import type { Unsubscribe } from "./board-store";

/** État de la synchronisation avec le serveur, tel qu'affiché par l'indicateur (FR-004). */
export type SyncStatus = "saved" | "saving" | "offline";

/** Synchronisation, vers le serveur, des modifications locales du tableau ouvert. */
export interface BoardSync {
  /** « Enregistré » (rien en attente), « Enregistrement… » (envoi en cours ou prévu), « Hors ligne » (dernier envoi en échec). */
  status(): SyncStatus;
  /** Notifié à chaque changement d'état ; jamais si l'état est inchangé. */
  onStatusChange(listener: (status: SyncStatus) => void): Unsubscribe;
  /** À la fermeture de la page : tente d'envoyer ce qui reste en attente sans attendre. */
  flushWithBeacon(): void;
  /** Cesse d'écouter le tableau et abandonne les envois et nouveaux essais prévus. */
  stop(): void;
}
