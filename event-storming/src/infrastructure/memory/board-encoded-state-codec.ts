import type { BoardEncodedState } from "../../application/ports/board-store";
import { Board, type BoardId, type BoardState } from "../../domain/board/board";

/** Contenu d'un état encodé mémoire : l'état sans identifiant (l'identifiant est porté par l'URL). */
type StoredBoard = Omit<BoardState, "id">;

/**
 * Format mémoire : l'état complet en JSON. Chaque mise à jour mémoire est donc un état complet,
 * et fusionner revient à garder le dernier (suffisant en mono-utilisateur ; Yjs fusionne réellement).
 */
export function encodeBoard(board: Board): BoardEncodedState {
  const stored: StoredBoard = { name: board.name, stickies: board.stickies, links: board.links, frames: board.frames };
  return new TextEncoder().encode(JSON.stringify(stored));
}

/** Un état vide (tableau neuf) donne un tableau vide nommé par défaut. */
export function decodeBoard(id: BoardId, state: BoardEncodedState): Board {
  if (state.length === 0) return Board.create(id);
  const parsed: unknown = JSON.parse(new TextDecoder().decode(state));
  if (!isStoredBoard(parsed)) throw new Error("État encodé de tableau invalide");
  return Board.restore({ id, ...parsed });
}

/** Garde de forme minimale : le contenu des éléments reste celui écrit par `encodeBoard`. */
function isStoredBoard(value: unknown): value is StoredBoard {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "stickies" in value &&
    Array.isArray(value.stickies) &&
    "links" in value &&
    Array.isArray(value.links) &&
    "frames" in value &&
    Array.isArray(value.frames)
  );
}
