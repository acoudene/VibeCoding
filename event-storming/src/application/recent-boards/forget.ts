import { boardId } from "../../domain/board/board";
import type { RecentBoards } from "../ports/recent-boards";

export interface ForgetRecentBoardCommand {
  readonly id: string;
}

/** Retire un tableau des tableaux récents sans le supprimer côté serveur (FR-005). */
export class ForgetRecentBoard {
  constructor(private readonly recentBoards: RecentBoards) {}

  execute(command: ForgetRecentBoardCommand): void {
    this.recentBoards.forget(boardId(command.id));
  }
}
