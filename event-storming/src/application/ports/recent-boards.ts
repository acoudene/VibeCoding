import type { BoardId } from "../../domain/board/board";
import type { BoardName } from "../../domain/board/board-name";

/** Tableau déjà ouvert dans ce navigateur (FR-005). */
export interface RecentBoard {
  readonly id: BoardId;
  readonly name: BoardName;
  readonly openedAt: Date;
}

/** Liste locale au navigateur des tableaux ouverts ; ne touche jamais aux tableaux côté serveur. */
export interface RecentBoards {
  /** Du plus récent au plus ancien (`openedAt` décroissant). */
  list(): readonly RecentBoard[];
  /** Ajoute le tableau ou remplace son entrée (un seul exemplaire par identifiant). */
  touch(entry: RecentBoard): void;
  /** Retire le tableau de la liste ; sans effet s'il n'y est pas. */
  forget(id: BoardId): void;
}
