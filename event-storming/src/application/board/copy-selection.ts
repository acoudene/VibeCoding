import type { BoardFragment } from "../../domain/board/board";
import type { BoardStore } from "../ports/board-store";

export interface CopySelectionCommand {
  readonly stickyIds: readonly string[];
}

/** Copie la sélection ; le tableau n'est pas modifié, le presse-papiers appartient à l'appelant (FR-042). */
export class CopySelection {
  constructor(private readonly store: BoardStore) {}

  execute(command: CopySelectionCommand): BoardFragment {
    return this.store.current().copy(command.stickyIds);
  }
}
