import type { StickyKind } from "../../domain/board/sticky-kind";
import type { BoardStore } from "../ports/board-store";

export interface EditStickyCommand {
  readonly id: string;
  readonly label?: string;
  /** Vide : retire l'identifiant. */
  readonly identifier?: string;
  readonly notes?: string;
  readonly kind?: StickyKind;
}

/** Modifie texte, identifiant, notes ou type d'un post-it (FR-011, FR-012, FR-015) ; changer le type requalifie ses liens. */
export class EditSticky {
  constructor(private readonly store: BoardStore) {}

  execute(command: EditStickyCommand): void {
    const { id, ...patch } = command;
    this.store.apply(this.store.current().updateSticky(id, patch).changes);
  }
}
