import { describe, expect, it } from "vitest";
import type { RecentBoard, RecentBoards } from "../../../src/application/ports/recent-boards";
import { boardId } from "../../../src/domain/board/board";
import { boardName } from "../../../src/domain/board/board-name";

function entry(id: string, name: string, openedAt: string): RecentBoard {
  return { id: boardId(id), name: boardName(name), openedAt: new Date(openedAt) };
}

/** Contrat commun aux implémentations de `RecentBoards` (mémoire et localStorage). */
export function describeRecentBoardsContract(name: string, create: () => RecentBoards): void {
  describe(`${name} (contrat RecentBoards)`, () => {
    it("est vide au départ", () => {
      expect(create().list()).toEqual([]);
    });

    it("liste du plus récent au plus ancien", () => {
      const recents = create();
      recents.touch(entry("b-1", "Ancien", "2026-10-18T09:00:00Z"));
      recents.touch(entry("b-2", "Récent", "2026-10-18T11:00:00Z"));
      recents.touch(entry("b-3", "Milieu", "2026-10-18T10:00:00Z"));
      expect(recents.list().map((e) => e.id)).toEqual(["b-2", "b-3", "b-1"]);
    });

    it("restitue nom et date d'ouverture", () => {
      const recents = create();
      const opened = entry("b-1", "Mon tableau", "2026-10-18T09:00:00Z");
      recents.touch(opened);
      expect(recents.list()).toEqual([opened]);
    });

    it("remplace l'entrée d'un tableau déjà présent", () => {
      const recents = create();
      recents.touch(entry("b-1", "Avant", "2026-10-18T09:00:00Z"));
      recents.touch(entry("b-1", "Après", "2026-10-18T12:00:00Z"));
      expect(recents.list()).toEqual([entry("b-1", "Après", "2026-10-18T12:00:00Z")]);
    });

    it("retire un tableau de la liste", () => {
      const recents = create();
      recents.touch(entry("b-1", "Un", "2026-10-18T09:00:00Z"));
      recents.touch(entry("b-2", "Deux", "2026-10-18T10:00:00Z"));
      recents.forget(boardId("b-1"));
      expect(recents.list().map((e) => e.id)).toEqual(["b-2"]);
    });

    it("ignore le retrait d'un tableau absent", () => {
      const recents = create();
      recents.forget(boardId("b-9"));
      expect(recents.list()).toEqual([]);
    });
  });
}
