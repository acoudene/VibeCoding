import { describe, expect, it } from "vitest";
import { RenameBoard } from "../../../../src/application/board/rename-board";
import { boardId } from "../../../../src/domain/board/board";
import { boardName } from "../../../../src/domain/board/board-name";
import { InMemoryBoardStore } from "../../../../src/infrastructure/memory/in-memory-board-store";
import { InMemoryRecentBoards } from "../../../../src/infrastructure/memory/in-memory-recent-boards";

const id = boardId("b-1");
const openedAt = new Date("2026-01-01T10:00:00Z");

function setup() {
  const store = new InMemoryBoardStore();
  store.load(id, new Uint8Array());
  const recentBoards = new InMemoryRecentBoards();
  return { store, recentBoards, rename: new RenameBoard(store, recentBoards) };
}

describe("RenameBoard", () => {
  it("renomme le tableau ouvert", () => {
    const { store, rename } = setup();
    rename.execute({ name: "Commande" });
    expect(store.current().name).toBe("Commande");
  });

  it("met à jour l'entrée des tableaux récents en gardant son heure d'ouverture", () => {
    const { recentBoards, rename } = setup();
    recentBoards.touch({ id, name: boardName("Ancien"), openedAt });
    rename.execute({ name: "Nouveau" });
    expect(recentBoards.list()).toEqual([{ id, name: "Nouveau", openedAt }]);
  });

  it("n'ajoute pas aux tableaux récents un tableau qui n'y figure pas", () => {
    const { recentBoards, rename } = setup();
    rename.execute({ name: "Nouveau" });
    expect(recentBoards.list()).toEqual([]);
  });

  it("refuse un nom vide sans toucher aux tableaux récents", () => {
    const { recentBoards, rename } = setup();
    recentBoards.touch({ id, name: boardName("Ancien"), openedAt });
    expect(() => rename.execute({ name: "  " })).toThrow();
    expect(recentBoards.list().map((b) => b.name)).toEqual(["Ancien"]);
  });
});
