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
  // Octets produits par `encodeBoard` de cet adaptateur de test : aucune source externe à valider.
  const stored: StoredBoard = JSON.parse(new TextDecoder().decode(snapshot));
  return Board.restore({ id, ...stored });
}
