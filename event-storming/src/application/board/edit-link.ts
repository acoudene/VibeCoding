import type { BoardStore } from "../ports/board-store";

export interface EditLinkCommand {
  readonly linkId: string;
  readonly action: "reverse" | "remove";
}

/** Inverse ou supprime un lien (FR-023, FR-024) ; supprimer un lien conserve les post-its. */
export class EditLink {
  constructor(private readonly store: BoardStore) {}

  execute(command: EditLinkCommand): void {
    const board = this.store.current();
    const { changes } = command.action === "reverse" ? board.reverseLink(command.linkId) : board.removeLink(command.linkId);
    this.store.apply(changes);
  }
}
