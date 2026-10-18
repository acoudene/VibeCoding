import type { BoardHistory } from "../ports/board-history";

/** Annule la dernière action locale (FR-044) ; sans effet s'il n'y a rien à annuler. */
export class Undo {
  constructor(private readonly history: BoardHistory) {}

  execute(): void {
    this.history.undo();
  }
}
