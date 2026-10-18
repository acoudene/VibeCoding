import type { BoardStore } from "../ports/board-store";

export interface DeleteSelectionCommand {
  readonly stickyIds: readonly string[];
}

/** Supprime les post-its sélectionnés et leurs liens, en une seule étape d'annulation. */
export class DeleteSelection {
  constructor(private readonly store: BoardStore) {}

  execute(command: DeleteSelectionCommand): void {
    this.store.apply(this.store.current().removeStickies(command.stickyIds).changes);
  }
}
