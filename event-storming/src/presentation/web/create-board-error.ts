import { BoardGatewayUnavailableError, BoardUpdateRejectedError } from "../../application/ports/board-gateway";

/** Message affiché quand la création d'un tableau échoue : distingue l'échec transitoire du refus définitif. */
export function createBoardErrorMessage(error: unknown): string {
  if (error instanceof BoardGatewayUnavailableError) return "Serveur injoignable, réessayez.";
  if (error instanceof BoardUpdateRejectedError) return "Le serveur a refusé la création du tableau.";
  return "Impossible de créer le tableau.";
}
