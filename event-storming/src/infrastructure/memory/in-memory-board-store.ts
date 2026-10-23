import type { BoardHistory } from "../../application/ports/board-history";
import {
  NoOpenBoardError,
  type BoardEncodedState,
  type BoardStore,
  type BoardUpdate,
  type Unsubscribe,
} from "../../application/ports/board-store";
import { Board, type BoardId, type BoardState } from "../../domain/board/board";
import type { BoardChange } from "../../domain/board/board-change";
import { decodeBoard, encodeBoard } from "./board-encoded-state-codec";
import { applyBoardChange } from "./board-state-changes";

/**
 * Tableau ouvert et son historique, en mémoire (tests). Les deux ports partagent le même document,
 * comme `Y.Doc` et `Y.UndoManager` en production : un seul objet les implémente.
 */
export class InMemoryBoardStore implements BoardStore, BoardHistory {
  private board: Board | undefined;
  private past: Board[] = [];
  private future: Board[] = [];
  private readonly listeners = new Set<(update: BoardUpdate) => void>();

  load(id: BoardId, state: BoardEncodedState): void {
    this.board = decodeBoard(id, state);
    this.past = [];
    this.future = [];
  }

  current(): Board {
    if (this.board === undefined) throw new NoOpenBoardError();
    return this.board;
  }

  apply(changes: readonly BoardChange[]): void {
    if (changes.length === 0) return;
    const current = this.current();
    this.past.push(current);
    this.future = [];
    this.replace(Board.restore(changes.reduce(applyBoardChange, stateOf(current))));
  }

  onUpdate(listener: (update: BoardUpdate) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  undo(): void {
    const previous = this.past.pop();
    if (previous === undefined) return;
    this.future.push(this.current());
    this.replace(previous);
  }

  redo(): void {
    const next = this.future.pop();
    if (next === undefined) return;
    this.past.push(this.current());
    this.replace(next);
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  private replace(board: Board): void {
    this.board = board;
    const update = encodeBoard(board);
    for (const listener of this.listeners) listener(update);
  }
}

function stateOf(board: Board): BoardState {
  return { id: board.id, name: board.name, stickies: board.stickies, links: board.links, frames: board.frames };
}
