import type { BoardFragment } from "../../domain/board/board";
import type { Position } from "../../domain/board/geometry";
import type { IdGenerator } from "../../domain/board/id-generator";
import type { BoardStore } from "../ports/board-store";

export interface PasteFragmentCommand {
  readonly fragment: BoardFragment;
  /** Point au pointeur : centre du groupe collé. */
  readonly at: Position;
}

export interface PasteFragmentResult {
  readonly createdIds: readonly string[];
}

/** Colle un fragment copié au pointeur, avec de nouveaux identifiants (FR-043). */
export class PasteFragment {
  constructor(
    private readonly store: BoardStore,
    private readonly ids: IdGenerator,
  ) {}

  execute(command: PasteFragmentCommand): PasteFragmentResult {
    const { changes, createdIds } = this.store.current().paste(command.fragment, command.at, this.ids);
    this.store.apply(changes);
    return { createdIds };
  }
}
