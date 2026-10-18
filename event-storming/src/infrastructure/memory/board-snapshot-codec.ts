import type { BoardSnapshot } from "../../application/ports/board-store";
import { Board, type BoardId, type BoardState } from "../../domain/board/board";

/** Contenu d'un instantané mémoire : l'état sans identifiant (l'identifiant est porté par l'URL). */
type StoredBoard = Omit<BoardState, "id">;

/**
 * Format mémoire : l'état complet en JSON. Chaque mise à jour mémoire est donc un instantané complet,
 * et fusionner revient à garder le dernier (suffisant en mono-utilisateur ; Yjs fusionne réellement).
 */
export function encodeBoard(board: Board): BoardSnapshot {
  const stored: StoredBoard = { name: board.name, stickies: board.stickies, links: board.links, frames: board.frames };
  return new TextEncoder().encode(JSON.stringify(stored));
}

/** Un instantané vide (tableau neuf) donne un tableau vide nommé par défaut. */
export function decodeBoard(id: BoardId, snapshot: BoardSnapshot): Board {
  if (snapshot.length === 0) return Board.create(id);
  const parsed: unknown = JSON.parse(new TextDecoder().decode(snapshot));
  if (!isStoredBoard(parsed)) throw new Error("Instantané de tableau invalide");
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
