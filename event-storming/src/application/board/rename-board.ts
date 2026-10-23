import type { BoardStore } from "../ports/board-store";
import type { RecentBoards } from "../ports/recent-boards";

export interface RenameBoardCommand {
  readonly name: string;
}

/** Renomme le tableau ouvert (FR-006) et rafraîchit son entrée récente ; un nom vide est refusé par le domaine. */
export class RenameBoard {
  constructor(
    private readonly store: BoardStore,
    private readonly recentBoards: RecentBoards,
  ) {}

  execute(command: RenameBoardCommand): void {
    const { board, changes } = this.store.current().rename(command.name);
    this.store.apply(changes);
    const entry = this.recentBoards.list().find((recent) => recent.id === board.id);
    if (entry !== undefined) this.recentBoards.touch({ ...entry, name: board.name });
  }
}
