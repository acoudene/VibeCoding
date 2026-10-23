import type { RecentBoard, RecentBoards } from "../../application/ports/recent-boards";
import type { BoardId } from "../../domain/board/board";

export class InMemoryRecentBoards implements RecentBoards {
  private readonly entries = new Map<BoardId, RecentBoard>();

  list(): readonly RecentBoard[] {
    return [...this.entries.values()].sort((a, b) => b.openedAt.getTime() - a.openedAt.getTime());
  }

  touch(entry: RecentBoard): void {
    this.entries.set(entry.id, entry);
  }

  forget(id: BoardId): void {
    this.entries.delete(id);
  }
}
