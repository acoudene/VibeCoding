import { describe, expect, it } from "vitest";
import { DeleteSelection } from "../../../../src/application/board/delete-selection";
import { EditSticky } from "../../../../src/application/board/edit-sticky";
import { MoveSticky } from "../../../../src/application/board/move-sticky";
import { PlaceSticky } from "../../../../src/application/board/place-sticky";
import { boardId } from "../../../../src/domain/board/board";
import { UnknownStickyError } from "../../../../src/domain/board/errors";
import { InMemoryBoardStore } from "../../../../src/infrastructure/memory/in-memory-board-store";
import { ScriptedIdGenerator } from "../../../../src/infrastructure/memory/scripted-id-generator";

function setup() {
  const store = new InMemoryBoardStore();
  store.load(boardId("b-1"), new Uint8Array());
  const ids = new ScriptedIdGenerator();
  return { store, place: new PlaceSticky(store, ids) };
}

describe("PlaceSticky", () => {
  it("pose un post-it du type donné et renvoie son identifiant", () => {
    const { store, place } = setup();
    const { id } = place.execute({ kind: "Command", position: { x: 400, y: 300 } });
    expect(store.current().sticky(id)).toEqual({
      id,
      kind: "Command",
      label: "",
      position: { x: 400, y: 300 },
      notes: "",
    });
  });

  it("forme une seule étape d'annulation", () => {
    const { store, place } = setup();
    place.execute({ kind: "Actor", position: { x: 0, y: 0 } });
    store.undo();
    expect(store.current().stickies).toEqual([]);
  });
});

describe("EditSticky", () => {
  it("modifie texte, identifiant, notes et type", () => {
    const { store, place } = setup();
    const { id } = place.execute({ kind: "DomainEvent", position: { x: 0, y: 0 }, label: "Commande" });
    new EditSticky(store).execute({ id, label: "Commande passée", identifier: "OrderPlaced", notes: "Montant > 0", kind: "Policy" });
    expect(store.current().sticky(id)).toMatchObject({
      kind: "Policy",
      label: "Commande passée",
      identifier: "OrderPlaced",
      notes: "Montant > 0",
    });
  });

  it("refuse un post-it inconnu", () => {
    const { store } = setup();
    expect(() => new EditSticky(store).execute({ id: "nope", label: "x" })).toThrow(UnknownStickyError);
  });
});

describe("MoveSticky", () => {
  it("déplace le post-it", () => {
    const { store, place } = setup();
    const { id } = place.execute({ kind: "Actor", position: { x: 100, y: 100 } });
    new MoveSticky(store).execute({ id, to: { x: 250, y: 180 } });
    expect(store.current().sticky(id)?.position).toEqual({ x: 250, y: 180 });
  });
});

describe("DeleteSelection", () => {
  it("supprime les post-its et leurs liens en une étape d'annulation", () => {
    const { store, place } = setup();
    const a = place.execute({ kind: "Command", position: { x: 0, y: 0 } }).id;
    const b = place.execute({ kind: "Aggregate", position: { x: 300, y: 0 } }).id;
    store.apply(store.current().addLink(a, b, new ScriptedIdGenerator()).changes);
    new DeleteSelection(store).execute({ stickyIds: [b] });
    expect([store.current().stickies.length, store.current().links.length]).toEqual([1, 0]);
    store.undo();
    expect([store.current().stickies.length, store.current().links.length]).toEqual([2, 1]);
  });
});
