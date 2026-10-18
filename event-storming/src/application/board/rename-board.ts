import type { BoardStore } from "../ports/board-store";

export interface RenameBoardCommand {
  readonly name: string;
}

/** Renomme le tableau ouvert (FR-006) ; un nom vide est refusé par le domaine. */
export class RenameBoard {
  constructor(private readonly store: BoardStore) {}

  execute(command: RenameBoardCommand): void {
    this.store.apply(this.store.current().rename(command.name).changes);
  }
}
