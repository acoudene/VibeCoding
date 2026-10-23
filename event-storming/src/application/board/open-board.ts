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

export interface OpenBoardOptions {
  /**
   * Interrogée après la lecture du serveur : `false` si l'ouverture est devenue obsolète (l'utilisateur a quitté ce
   * tableau ou en a ouvert un autre entre-temps). Par défaut, l'ouverture est toujours d'actualité.
   */
  readonly isCurrent: () => boolean;
}

/**
 * Charge le tableau depuis le serveur (FR-002, FR-003) et l'inscrit dans les tableaux récents (FR-005).
 * Une ouverture obsolète à l'arrivée de la réponse ne touche ni au tableau ouvert ni aux récents : `undefined`.
 */
export class OpenBoard {
  constructor(
    private readonly gateway: Pick<BoardGateway, "open">,
    private readonly store: BoardStore,
    private readonly recentBoards: RecentBoards,
    private readonly clock: Clock,
  ) {}

  async execute(command: OpenBoardCommand, options?: OpenBoardOptions): Promise<OpenBoardResult | undefined> {
    const id = boardId(command.id);
    const state = await this.gateway.open(id);
    if (options !== undefined && !options.isCurrent()) return undefined;
    this.store.load(id, state);
    const { name } = this.store.current();
    this.recentBoards.touch({ id, name, openedAt: this.clock.now() });
    return { id, name };
  }
}
