import type { BoardId } from "../../domain/board/board";

/** Vue d'un tableau : décalage à l'écran et zoom (1 = 100 %). */
export interface Viewport {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

/** Vue mémorisée par tableau, pour ce navigateur (FR-052) ; un confort, jamais une donnée du tableau. */
export interface ViewportStore {
  /** Dernière vue mémorisée du tableau ; `undefined` si aucune (ou illisible). */
  load(id: BoardId): Viewport | undefined;
  /** Mémorise la vue ; une erreur de stockage est ignorée. */
  save(id: BoardId, viewport: Viewport): void;
}
