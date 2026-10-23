import type { BoardChange } from "../../domain/board/board-change";
import type { BoardStore } from "../ports/board-store";

export interface DeleteSelectionCommand {
  readonly stickyIds: readonly string[];
  /** Liens sélectionnés ; ceux déjà supprimés avec un post-it de la sélection sont ignorés. */
  readonly linkIds?: readonly string[];
  readonly frameIds?: readonly string[];
}

/**
 * Supprime la sélection (FR-041) en une seule étape d'annulation (FR-044) : les post-its et, en cascade, leurs liens,
 * puis les liens sélectionnés encore présents, puis les cadres (leurs post-its restent sur le tableau).
 */
export class DeleteSelection {
  constructor(private readonly store: BoardStore) {}

  execute(command: DeleteSelectionCommand): void {
    let board = this.store.current();
    const changes: BoardChange[] = [];
    const removedStickies = board.removeStickies(command.stickyIds);
    board = removedStickies.board;
    changes.push(...removedStickies.changes);
    for (const linkId of command.linkIds ?? []) {
      if (board.link(linkId) === undefined) continue;
      const result = board.removeLink(linkId);
      board = result.board;
      changes.push(...result.changes);
    }
    for (const frameId of command.frameIds ?? []) {
      const result = board.removeFrame(frameId);
      board = result.board;
      changes.push(...result.changes);
    }
    this.store.apply(changes);
  }
}
