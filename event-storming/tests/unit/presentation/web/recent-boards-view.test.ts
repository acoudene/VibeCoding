import { describe, expect, it } from "vitest";
import { boardId } from "../../../../src/domain/board/board";
import { boardName } from "../../../../src/domain/board/board-name";
import { toRecentBoardRows } from "../../../../src/presentation/web/recent-boards-view";

describe("toRecentBoardRows", () => {
  it("donne le nom, le lien et la date lisible de chaque tableau, ordre conservé", () => {
    const rows = toRecentBoardRows([
      { id: boardId("a"), name: boardName("Commandes"), openedAt: new Date("2026-10-18T09:05:00Z") },
      { id: boardId("b"), name: boardName("Livraison"), openedAt: new Date("2026-10-17T20:00:00Z") },
    ]);
    expect(rows.map((row) => [row.id, row.name, row.href])).toEqual([
      ["a", "Commandes", "/b/a"],
      ["b", "Livraison", "/b/b"],
    ]);
    expect(rows[0]?.openedAtIso).toBe("2026-10-18T09:05:00.000Z");
    expect(rows[0]?.openedAtLabel).toMatch(/2026/);
  });
  it("renvoie une liste vide sans tableau", () => {
    expect(toRecentBoardRows([])).toEqual([]);
  });
});
