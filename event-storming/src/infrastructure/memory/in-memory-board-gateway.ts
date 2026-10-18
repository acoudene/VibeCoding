import { BoardNotFoundError, type BoardGateway } from "../../application/ports/board-gateway";
import type { BoardEncodedState, BoardUpdate } from "../../application/ports/board-store";
import { boardId, type BoardId } from "../../domain/board/board";
import type { IdGenerator } from "../../domain/board/id-generator";

/** Serveur de tableaux en mémoire (tests). Les mises à jour mémoire étant des états complets, la dernière l'emporte. */
export class InMemoryBoardGateway implements BoardGateway {
  private readonly boards = new Map<BoardId, BoardEncodedState>();

  constructor(private readonly ids: IdGenerator) {}

  async create(): Promise<BoardId> {
    const id = boardId(this.ids.next());
    this.boards.set(id, new Uint8Array());
    return id;
  }

  async open(id: BoardId): Promise<BoardEncodedState> {
    const state = this.boards.get(id);
    if (state === undefined) throw new BoardNotFoundError(id);
    return state;
  }

  async pushUpdate(id: BoardId, update: BoardUpdate): Promise<void> {
    if (!this.boards.has(id)) throw new BoardNotFoundError(id);
    this.boards.set(id, update);
  }
}
