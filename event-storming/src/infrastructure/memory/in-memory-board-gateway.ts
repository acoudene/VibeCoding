import { BoardNotFoundError, type BoardGateway } from "../../application/ports/board-gateway";
import type { BoardSnapshot, BoardUpdate } from "../../application/ports/board-store";
import { boardId, type BoardId } from "../../domain/board/board";
import type { IdGenerator } from "../../domain/board/id-generator";

/** Serveur de tableaux en mémoire (tests). Les mises à jour mémoire étant des instantanés complets, la dernière l'emporte. */
export class InMemoryBoardGateway implements BoardGateway {
  private readonly boards = new Map<BoardId, BoardSnapshot>();

  constructor(private readonly ids: IdGenerator) {}

  async create(): Promise<BoardId> {
    const id = boardId(this.ids.next());
    this.boards.set(id, new Uint8Array());
    return id;
  }

  async open(id: BoardId): Promise<BoardSnapshot> {
    const snapshot = this.boards.get(id);
    if (snapshot === undefined) throw new BoardNotFoundError(id);
    return snapshot;
  }

  async pushUpdate(id: BoardId, update: BoardUpdate): Promise<void> {
    if (!this.boards.has(id)) throw new BoardNotFoundError(id);
    this.boards.set(id, update);
  }
}
