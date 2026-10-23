import type { BoardHistory } from "../ports/board-history";

/** Rétablit la dernière action annulée (FR-044) ; sans effet s'il n'y a rien à rétablir. */
export class Redo {
  constructor(private readonly history: BoardHistory) {}

  execute(): void {
    this.history.redo();
  }
}
