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

/** Échec qui peut se résoudre en réessayant : réseau, délai dépassé, 5xx, 408, 429. */
export class BoardGatewayUnavailableError extends Error {
  constructor(message = "Serveur injoignable") {
    super(message);
    this.name = "BoardGatewayUnavailableError";
  }
}

/** Refus définitif du serveur (autre 4xx, dont 413 : tableau trop volumineux) : réessayer ne servirait à rien. */
export class BoardUpdateRejectedError extends Error {
  constructor(readonly reason: "TOO_LARGE" | "REJECTED" = "REJECTED") {
    super(reason === "TOO_LARGE" ? "Tableau trop volumineux" : "Requête refusée par le serveur");
    this.name = "BoardUpdateRejectedError";
  }
}
