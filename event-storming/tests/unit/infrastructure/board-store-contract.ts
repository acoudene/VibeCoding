import { describe, expect, it } from "vitest";
import type { BoardHistory } from "../../../src/application/ports/board-history";
import {
  NoOpenBoardError,
  type BoardEncodedState,
  type BoardStore,
  type BoardUpdate,
} from "../../../src/application/ports/board-store";
import { Board, boardId } from "../../../src/domain/board/board";
import { sequentialIds } from "../domain/board/sequential-ids";

/** Adaptateur testé : le tableau ouvert et son historique partagent un même document. */
export interface BoardStoreAdapter {
  create(): BoardStore & BoardHistory;
  /** État du tableau à rouvrir après avoir reçu, dans l'ordre, les mises à jour émises par `onUpdate`. */
  encodedStateAfter(updates: readonly BoardUpdate[]): BoardEncodedState;
}

const id = boardId("b-1");
const EMPTY = new Uint8Array();

/** Contrat commun aux implémentations de `BoardStore` et `BoardHistory` (mémoire et Yjs). */
export function describeBoardStoreContract(name: string, adapter: BoardStoreAdapter): void {
  function openedStore(): BoardStore & BoardHistory {
    const store = adapter.create();
    store.load(id, EMPTY);
    return store;
  }

  function placeSticky(store: BoardStore, label: string): void {
    store.apply(
      store.current().addSticky({ kind: "DomainEvent", position: { x: 0, y: 0 }, label }, sequentialIds(label)).changes,
    );
  }

  describe(`${name} (contrat BoardStore / BoardHistory)`, () => {
    it("refuse de lire un tableau avant ouverture", () => {
      expect(() => adapter.create().current()).toThrow(NoOpenBoardError);
    });

    it("ouvre un état vide comme un tableau neuf", () => {
      const board = openedStore().current();
      expect([board.id, board.name, board.stickies, board.links, board.frames]).toEqual([
        id,
        "Tableau sans titre",
        [],
        [],
        [],
      ]);
    });

    it("applique les modifications de toutes les sortes", () => {
      const store = openedStore();
      const ids = sequentialIds();
      let board = Board.create(id);
      const steps = [
        (b: Board) => b.rename("Atelier"),
        (b: Board) => b.addSticky({ kind: "Command", position: { x: 0, y: 0 }, identifier: "CMD-1" }, ids),
        (b: Board) => b.addSticky({ kind: "Aggregate", position: { x: 300, y: 0 } }, ids),
        (b: Board) => b.updateSticky("id-1", { label: "Passer commande", notes: "à préciser", identifier: "" }),
        (b: Board) => b.addLink("id-1", "id-2", ids),
        (b: Board) => b.reverseLink("id-3"),
        (b: Board) => b.addFrame({ x: -10, y: -10, width: 800, height: 400 }, ids),
        (b: Board) => b.updateFrame("id-4", { name: "Commandes" }),
        (b: Board) => b.moveFrame("id-4", 5, 5),
        (b: Board) => b.removeFrame("id-4"),
        (b: Board) => b.removeLink("id-3"),
        (b: Board) => b.removeStickies(["id-1"]),
      ];
      for (const step of steps) {
        const result = step(board);
        store.apply(result.changes);
        board = result.board;
        expect(store.current()).toEqual(board);
      }
    });

    it("restitue le tableau depuis ses mises à jour", () => {
      const store = openedStore();
      const updates: BoardUpdate[] = [];
      store.onUpdate((u) => updates.push(u));
      store.apply(store.current().rename("Atelier").changes);
      placeSticky(store, "Commande passée");

      const reopened = adapter.create();
      reopened.load(id, adapter.encodedStateAfter(updates));
      expect(reopened.current()).toEqual(store.current());
    });

    it("restitue aussi les annulations et rétablissements depuis les mises à jour", () => {
      const store = openedStore();
      const updates: BoardUpdate[] = [];
      store.onUpdate((u) => updates.push(u));
      placeSticky(store, "A");
      placeSticky(store, "B");
      store.undo();

      const reopened = adapter.create();
      reopened.load(id, adapter.encodedStateAfter(updates));
      expect(reopened.current()).toEqual(store.current());
    });

    it("n'émet rien ni n'enregistre d'étape pour une modification vide", () => {
      const store = openedStore();
      const updates: BoardUpdate[] = [];
      store.onUpdate((u) => updates.push(u));
      store.apply([]);
      expect([updates, store.canUndo()]).toEqual([[], false]);
    });

    it("n'émet rien à l'ouverture d'un tableau", () => {
      const source = openedStore();
      const updates: BoardUpdate[] = [];
      source.onUpdate((u) => updates.push(u));
      placeSticky(source, "A");

      const store = adapter.create();
      const emitted: BoardUpdate[] = [];
      store.onUpdate((u) => emitted.push(u));
      store.load(id, adapter.encodedStateAfter(updates));
      expect(emitted).toEqual([]);
    });

    it("cesse de notifier après désabonnement", () => {
      const store = openedStore();
      const updates: BoardUpdate[] = [];
      const unsubscribe = store.onUpdate((u) => updates.push(u));
      unsubscribe();
      placeSticky(store, "A");
      expect(updates).toEqual([]);
    });

    it("continue de notifier après réouverture d'un tableau", () => {
      const store = openedStore();
      const updates: BoardUpdate[] = [];
      store.onUpdate((u) => updates.push(u));
      store.load(id, EMPTY);
      placeSticky(store, "A");
      expect(updates).toHaveLength(1);
    });

    it("chaque action est une étape d'annulation distincte", () => {
      const store = openedStore();
      placeSticky(store, "A");
      placeSticky(store, "B");
      placeSticky(store, "C");
      store.undo();
      expect(store.current().stickies.map((s) => s.label)).toEqual(["A", "B"]);
    });

    it("une action de plusieurs modifications s'annule d'un coup", () => {
      const store = openedStore();
      const ids = sequentialIds();
      store.apply(store.current().addSticky({ kind: "Command", position: { x: 0, y: 0 } }, ids).changes);
      store.apply(store.current().addSticky({ kind: "Aggregate", position: { x: 300, y: 0 } }, ids).changes);
      store.apply(store.current().addLink("id-1", "id-2", ids).changes);
      const before = store.current();
      store.apply(store.current().removeStickies(["id-1"]).changes);
      store.undo();
      expect(store.current()).toEqual(before);
    });

    it("annule et rétablit une modification à la fois, en émettant une mise à jour", () => {
      const store = openedStore();
      placeSticky(store, "A");
      placeSticky(store, "B");
      const updates: BoardUpdate[] = [];
      store.onUpdate((u) => updates.push(u));

      store.undo();
      expect(store.current().stickies.map((s) => s.label)).toEqual(["A"]);
      expect([store.canUndo(), store.canRedo()]).toEqual([true, true]);
      store.redo();
      expect(store.current().stickies.map((s) => s.label)).toEqual(["A", "B"]);
      expect(store.canRedo()).toBe(false);
      expect(updates).toHaveLength(2);
    });

    it("annule une modification de post-it en rétablissant l'élément précédent", () => {
      const store = openedStore();
      placeSticky(store, "A");
      const before = store.current();
      const stickyId = before.stickies[0]?.id ?? "";
      store.apply(store.current().updateSticky(stickyId, { label: "B", identifier: "EVT-1" }).changes);
      store.undo();
      expect(store.current()).toEqual(before);
    });

    it("une nouvelle modification efface ce qui pouvait être rétabli", () => {
      const store = openedStore();
      placeSticky(store, "A");
      store.undo();
      placeSticky(store, "B");
      expect(store.canRedo()).toBe(false);
    });

    it("sans rien à annuler ni rétablir, ne change rien", () => {
      const store = openedStore();
      const updates: BoardUpdate[] = [];
      store.onUpdate((u) => updates.push(u));
      const before = store.current();
      store.undo();
      store.redo();
      expect(store.current()).toBe(before);
      expect(updates).toEqual([]);
    });

    it("ouvrir un tableau repart d'un historique vide", () => {
      const store = openedStore();
      placeSticky(store, "A");
      store.load(id, EMPTY);
      expect([store.canUndo(), store.canRedo()]).toEqual([false, false]);
    });
  });
}
