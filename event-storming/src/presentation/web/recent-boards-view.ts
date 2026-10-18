import type { RecentBoard } from "../../application/ports/recent-boards";
import { boardPath } from "./routes";

export interface RecentBoardRow {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly openedAtIso: string;
  readonly openedAtLabel: string;
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });

/** Lignes affichées sur l'accueil, dans l'ordre reçu (du plus récent au plus ancien). */
export function toRecentBoardRows(boards: readonly RecentBoard[]): RecentBoardRow[] {
  return boards.map((board) => ({
    id: board.id,
    name: board.name,
    href: boardPath(board.id),
    openedAtIso: board.openedAt.toISOString(),
    openedAtLabel: dateFormat.format(board.openedAt),
  }));
}
