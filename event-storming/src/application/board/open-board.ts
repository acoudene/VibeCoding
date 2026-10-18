import { boardId, type BoardId } from "../../domain/board/board";
import type { BoardName } from "../../domain/board/board-name";
import type { BoardGateway } from "../ports/board-gateway";
import type { BoardStore } from "../ports/board-store";
import type { Clock } from "../ports/clock";
import type { RecentBoards } from "../ports/recent-boards";

export interface OpenBoardCommand {
  /** Identifiant lu dans l'URL `/b/<id>`. */
  readonly id: string;
}

export interface OpenBoardResult {
  readonly id: BoardId;
  readonly name: BoardName;
}

/** Charge le tableau depuis le serveur (FR-002, FR-003) et l'inscrit dans les tableaux récents (FR-005). */
export class OpenBoard {
  constructor(
    private readonly gateway: BoardGateway,
    private readonly store: BoardStore,
    private readonly recentBoards: RecentBoards,
    private readonly clock: Clock,
  ) {}

  async execute(command: OpenBoardCommand): Promise<OpenBoardResult> {
    const id = boardId(command.id);
    this.store.load(id, await this.gateway.open(id));
    const { name } = this.store.current();
    this.recentBoards.touch({ id, name, openedAt: this.clock.now() });
    return { id, name };
  }
}
