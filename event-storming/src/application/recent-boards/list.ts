import type { RecentBoard, RecentBoards } from "../ports/recent-boards";

/** Tableaux ouverts dans ce navigateur, du plus récent au plus ancien (FR-005). */
export class ListRecentBoards {
  constructor(private readonly recentBoards: RecentBoards) {}

  execute(): readonly RecentBoard[] {
    return this.recentBoards.list();
  }
}
