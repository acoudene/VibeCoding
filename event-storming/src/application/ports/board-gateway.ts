import type { BoardId } from "../../domain/board/board";
import type { BoardEncodedState, BoardUpdate } from "./board-store";

/** Accès au serveur qui conserve les tableaux (FR-003) ; il ne fait que fusionner les mises à jour. */
export interface BoardGateway {
  /** Crée un tableau vide côté serveur et renvoie son identifiant non devinable. */
  create(): Promise<BoardId>;
  /** État complet du tableau ; rejette `BoardNotFoundError` s'il n'existe pas. */
  open(id: BoardId): Promise<BoardEncodedState>;
  /** Fusionne une mise à jour dans l'état du tableau ; rejette `BoardNotFoundError` s'il n'existe pas. */
  pushUpdate(id: BoardId, update: BoardUpdate): Promise<void>;
}

export class BoardNotFoundError extends Error {
  constructor(readonly boardId: string) {
    super("Tableau introuvable");
    this.name = "BoardNotFoundError";
  }
}
