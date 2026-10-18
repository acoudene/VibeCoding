import type { Board, BoardId } from "../../domain/board/board";
import type { BoardChange } from "../../domain/board/board-change";

/**
 * État complet d'un tableau, sérialisé. Opaque pour l'application : en production, état Yjs encodé
 * (`Y.encodeStateAsUpdate`) tel que renvoyé par `GET /api/boards/:id` ; vide pour un tableau neuf.
 */
export type BoardEncodedState = Uint8Array;

/** Modification locale sérialisée, à envoyer au serveur (`POST /api/boards/:id/updates`) ; opaque aussi. */
export type BoardUpdate = Uint8Array;

export type Unsubscribe = () => void;

/** Tableau ouvert dans ce client : source de vérité locale, synchronisée par ses mises à jour sérialisées. */
export interface BoardStore {
  /** Ouvre le tableau `id` depuis son état chargé ; remplace le tableau ouvert et vide l'historique. */
  load(id: BoardId, state: BoardEncodedState): void;
  /** Tableau ouvert ; lève `NoOpenBoardError` si aucun tableau n'a été chargé. */
  current(): Board;
  /** Applique les modifications d'une action utilisateur : une étape d'annulation, rien si la liste est vide. */
  apply(changes: readonly BoardChange[]): void;
  /** Notifié après chaque modification locale (`apply`, annuler, rétablir), jamais au chargement. */
  onUpdate(listener: (update: BoardUpdate) => void): Unsubscribe;
}

export class NoOpenBoardError extends Error {
  constructor() {
    super("Aucun tableau ouvert");
    this.name = "NoOpenBoardError";
  }
}
