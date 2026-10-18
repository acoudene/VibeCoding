import * as Y from "yjs";
import type { BoardHistory } from "../../application/ports/board-history";
import {
  NoOpenBoardError,
  type BoardSnapshot,
  type BoardStore,
  type BoardUpdate,
  type Unsubscribe,
} from "../../application/ports/board-store";
import type { Board, BoardId } from "../../domain/board/board";
import type { BoardChange } from "../../domain/board/board-change";
import { applyChanges, LOCAL_ORIGIN, readBoard } from "./board-doc-schema";
import { YjsBoardHistory } from "./yjs-board-history";

/** Tableau ouvert dans un `Y.Doc`, avec son historique. */
interface OpenBoard {
  readonly id: BoardId;
  readonly doc: Y.Doc;
  readonly history: YjsBoardHistory;
  /** Lecture du document mise en cache jusqu'à sa prochaine modification. */
  board: Board | undefined;
}

/**
 * Tableau ouvert, stocké dans un `Y.Doc` (schéma : `board-doc-schema.ts`). Implémente aussi
 * `BoardHistory` : l'historique doit suivre le document courant, remplacé à chaque ouverture.
 * `onUpdate` reçoit la mise à jour Yjs binaire de chaque action locale, annulation et rétablissement
 * compris (à envoyer au serveur) ; jamais celle du chargement.
 */
export class YjsBoardStore implements BoardStore, BoardHistory {
  private open: OpenBoard | undefined;
  private readonly listeners = new Set<(update: BoardUpdate) => void>();

  load(id: BoardId, snapshot: BoardSnapshot): void {
    const doc = new Y.Doc();
    if (snapshot.length > 0) Y.applyUpdate(doc, snapshot);
    this.close();
    const history = new YjsBoardHistory(doc);
    const open: OpenBoard = { id, doc, history, board: undefined };
    doc.on("update", (update: Uint8Array, origin: unknown) => {
      open.board = undefined;
      if (origin === LOCAL_ORIGIN || origin === history.origin) this.emit(update);
    });
    this.open = open;
  }

  current(): Board {
    const open = this.opened();
    open.board ??= readBoard(open.id, open.doc);
    return open.board;
  }

  apply(changes: readonly BoardChange[]): void {
    if (changes.length === 0) return;
    applyChanges(this.opened().doc, changes);
  }

  onUpdate(listener: (update: BoardUpdate) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  undo(): void {
    this.open?.history.undo();
  }

  redo(): void {
    this.open?.history.redo();
  }

  canUndo(): boolean {
    return this.open?.history.canUndo() ?? false;
  }

  canRedo(): boolean {
    return this.open?.history.canRedo() ?? false;
  }

  private opened(): OpenBoard {
    if (this.open === undefined) throw new NoOpenBoardError();
    return this.open;
  }

  private close(): void {
    this.open?.history.destroy();
    this.open?.doc.destroy();
    this.open = undefined;
  }

  private emit(update: BoardUpdate): void {
    for (const listener of this.listeners) listener(update);
  }
}
