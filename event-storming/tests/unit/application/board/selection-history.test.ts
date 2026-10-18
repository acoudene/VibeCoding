import { describe, expect, it } from "vitest";
import { CopySelection } from "../../../../src/application/board/copy-selection";
import { DuplicateSelection } from "../../../../src/application/board/duplicate-selection";
import { PasteFragment } from "../../../../src/application/board/paste-fragment";
import { PlaceSticky } from "../../../../src/application/board/place-sticky";
import { Redo } from "../../../../src/application/board/redo";
import { Undo } from "../../../../src/application/board/undo";
import { boardId } from "../../../../src/domain/board/board";
import { InMemoryBoardStore } from "../../../../src/infrastructure/memory/in-memory-board-store";
import { ScriptedIdGenerator } from "../../../../src/infrastructure/memory/scripted-id-generator";

function setup() {
  const store = new InMemoryBoardStore();
  store.load(boardId("b-1"), new Uint8Array());
  const ids = new ScriptedIdGenerator();
  const a = new PlaceSticky(store, ids).execute({ kind: "DomainEvent", position: { x: 100, y: 100 }, label: "A" }).id;
  return { store, ids, a };
}

describe("DuplicateSelection", () => {
  it("renvoie les identifiants créés, en une étape d'annulation", () => {
    const { store, ids, a } = setup();
    const { createdIds } = new DuplicateSelection(store, ids).execute({ stickyIds: [a] });
    expect(createdIds).toHaveLength(1);
    expect(store.current().stickies).toHaveLength(2);
    new Undo(store).execute();
    expect(store.current().stickies).toHaveLength(1);
  });
});

describe("CopySelection et PasteFragment", () => {
  it("colle le fragment copié centré sur le point donné sans modifier le tableau à la copie", () => {
    const { store, ids, a } = setup();
    const fragment = new CopySelection(store).execute({ stickyIds: [a] });
    expect(store.current().stickies).toHaveLength(1);
    const { createdIds } = new PasteFragment(store, ids).execute({ fragment, at: { x: 500, y: 500 } });
    expect(store.current().sticky(createdIds[0] ?? "")?.position).toEqual({ x: 420, y: 420 });
  });
});

describe("Undo et Redo", () => {
  it("annule puis rétablit", () => {
    const { store, a } = setup();
    new Undo(store).execute();
    expect(store.current().sticky(a)).toBeUndefined();
    new Redo(store).execute();
    expect(store.current().sticky(a)).toBeDefined();
  });

  it("sont sans effet quand il n'y a rien à annuler ou rétablir", () => {
    const { store } = setup();
    new Redo(store).execute();
    new Undo(store).execute();
    new Undo(store).execute();
    expect(store.current().stickies).toEqual([]);
  });
});
