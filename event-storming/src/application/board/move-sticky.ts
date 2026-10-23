import type { Position } from "../../domain/board/geometry";
import type { BoardStore } from "../ports/board-store";

export interface MoveStickyCommand {
  readonly id: string;
  /** Nouveau coin haut-gauche. */
  readonly to: Position;
}

/** Déplace un post-it (FR-014). */
export class MoveSticky {
  constructor(private readonly store: BoardStore) {}

  execute(command: MoveStickyCommand): void {
    this.store.apply(this.store.current().moveSticky(command.id, command.to).changes);
  }
}
