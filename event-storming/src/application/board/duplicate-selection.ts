import type { IdGenerator } from "../../domain/board/id-generator";
import type { BoardStore } from "../ports/board-store";

export interface DuplicateSelectionCommand {
  readonly stickyIds: readonly string[];
}

export interface DuplicateSelectionResult {
  /** Post-its créés : la nouvelle sélection. */
  readonly createdIds: readonly string[];
}

/** Duplique la sélection juste en dessous, liens internes compris (FR-041). */
export class DuplicateSelection {
  constructor(
    private readonly store: BoardStore,
    private readonly ids: IdGenerator,
  ) {}

  execute(command: DuplicateSelectionCommand): DuplicateSelectionResult {
    const { changes, createdIds } = this.store.current().duplicate(command.stickyIds, this.ids);
    this.store.apply(changes);
    return { createdIds };
  }
}
