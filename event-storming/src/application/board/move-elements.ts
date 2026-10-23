import type { BoardChange } from "../../domain/board/board-change";
import type { Position } from "../../domain/board/geometry";
import type { BoardStore } from "../ports/board-store";

export interface MoveElementsCommand {
  /** Post-its glissés, à leur nouveau coin haut-gauche. */
  readonly stickies: readonly { readonly id: string; readonly to: Position }[];
  /** Cadres glissés, avec leur décalage : leurs post-its les suivent (FR-031). */
  readonly frames: readonly { readonly id: string; readonly dx: number; readonly dy: number }[];
}

/**
 * Déplace d'un seul geste plusieurs post-its et cadres (FR-014, FR-031) : une seule étape d'annulation (FR-044).
 * Les cadres sont déplacés d'abord, avec leurs membres ; un post-it glissé finit ensuite à sa position donnée,
 * qu'il soit ou non membre d'un cadre déplacé (il n'est donc jamais décalé deux fois).
 */
export class MoveElements {
  constructor(private readonly store: BoardStore) {}

  execute(command: MoveElementsCommand): void {
    let board = this.store.current();
    const changes: BoardChange[] = [];
    for (const frame of command.frames) {
      const result = board.moveFrame(frame.id, frame.dx, frame.dy);
      board = result.board;
      changes.push(...result.changes);
    }
    for (const sticky of command.stickies) {
      const result = board.moveSticky(sticky.id, sticky.to);
      board = result.board;
      changes.push(...result.changes);
    }
    this.store.apply(changes);
  }
}

