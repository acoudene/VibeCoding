import { describe, expect, it } from "vitest";
import { NoOpenBoardError, type BoardUpdate } from "../../../../src/application/ports/board-store";
import { Board, boardId } from "../../../../src/domain/board/board";
import { InMemoryBoardStore } from "../../../../src/infrastructure/memory/in-memory-board-store";
import { sequentialIds } from "../../domain/board/sequential-ids";

const id = boardId("b-1");
const EMPTY = new Uint8Array();

function openedStore(): InMemoryBoardStore {
  const store = new InMemoryBoardStore();
  store.load(id, EMPTY);
  return store;
}

function placeSticky(store: InMemoryBoardStore, label: string): void {
  store.apply(store.current().addSticky({ kind: "DomainEvent", position: { x: 0, y: 0 }, label }, sequentialIds(label)).changes);
}

describe("InMemoryBoardStore", () => {
  it("refuse de lire un tableau avant ouverture", () => {
    expect(() => new InMemoryBoardStore().current()).toThrow(NoOpenBoardError);
  });

  it("ouvre un état vide comme un tableau neuf", () => {
    const board = openedStore().current();
    expect([board.id, board.name, board.stickies, board.links, board.frames]).toEqual([id, "Tableau sans titre", [], [], []]);
  });

  it("applique les modifications de toutes les sortes", () => {
    const store = openedStore();
    const ids = sequentialIds();
    let board = Board.create(id);
    const steps = [
      (b: Board) => b.rename("Atelier"),
      (b: Board) => b.addSticky({ kind: "Command", position: { x: 0, y: 0 } }, ids),
      (b: Board) => b.addSticky({ kind: "Aggregate", position: { x: 300, y: 0 } }, ids),
      (b: Board) => b.addLink("id-1", "id-2", ids),
      (b: Board) => b.reverseLink("id-3"),
      (b: Board) => b.addFrame({ x: -10, y: -10, width: 800, height: 400 }, ids),
      (b: Board) => b.moveFrame("id-4", 5, 5),
      (b: Board) => b.removeFrame("id-4"),
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

    const reopened = new InMemoryBoardStore();
    reopened.load(id, updates.at(-1) ?? EMPTY);
    expect(reopened.current()).toEqual(store.current());
  });

  it("n'émet rien ni n'enregistre d'étape pour une modification vide", () => {
    const store = openedStore();
    const updates: BoardUpdate[] = [];
    store.onUpdate((u) => updates.push(u));
    store.apply([]);
    expect([updates, store.canUndo()]).toEqual([[], false]);
  });

  it("cesse de notifier après désabonnement", () => {
    const store = openedStore();
    const updates: BoardUpdate[] = [];
    const unsubscribe = store.onUpdate((u) => updates.push(u));
    unsubscribe();
    placeSticky(store, "A");
    expect(updates).toEqual([]);
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

  it("une nouvelle modification efface ce qui pouvait être rétabli", () => {
    const store = openedStore();
    placeSticky(store, "A");
    store.undo();
    placeSticky(store, "B");
    expect(store.canRedo()).toBe(false);
  });

  it("sans rien à annuler ni rétablir, ne change rien", () => {
    const store = openedStore();
    const before = store.current();
    store.undo();
    store.redo();
    expect(store.current()).toBe(before);
  });

  it("ouvrir un tableau repart d'un historique vide", () => {
    const store = openedStore();
    placeSticky(store, "A");
    store.load(id, EMPTY);
    expect([store.canUndo(), store.canRedo()]).toEqual([false, false]);
  });
});
