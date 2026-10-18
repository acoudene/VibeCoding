import { describe, expect, it } from "vitest";
import { DeleteSelection } from "../../../../src/application/board/delete-selection";
import { DrawFrame } from "../../../../src/application/board/draw-frame";
import { LinkStickies } from "../../../../src/application/board/link-stickies";
import { PlaceSticky } from "../../../../src/application/board/place-sticky";
import { boardId } from "../../../../src/domain/board/board";
import { InMemoryBoardStore } from "../../../../src/infrastructure/memory/in-memory-board-store";
import { ScriptedIdGenerator } from "../../../../src/infrastructure/memory/scripted-id-generator";

function setup() {
  const store = new InMemoryBoardStore();
  store.load(boardId("b-1"), new Uint8Array());
  const ids = new ScriptedIdGenerator();
  const place = (x: number) => new PlaceSticky(store, ids).execute({ kind: "DomainEvent", position: { x, y: 0 } }).id;
  const linkOf = (sourceId: string, targetId: string) => new LinkStickies(store, ids).execute({ sourceId, targetId }).id;
  const frameId = new DrawFrame(store, ids).execute({ rect: { x: 2000, y: 0, width: 400, height: 300 } }).id;
  return { store, place, linkOf, frameId };
}

describe("DeleteSelection (sélection mixte)", () => {
  it("supprime post-its, liens et cadres sélectionnés en une seule étape d'annulation", () => {
    const { store, place, linkOf, frameId } = setup();
    const [a, b, c, d] = [place(0), place(300), place(600), place(900)];
    const cascaded = linkOf(a, b); // supprimé avec a, et aussi sélectionné
    const independent = linkOf(c, d); // non rattaché aux post-its supprimés
    new DeleteSelection(store).execute({ stickyIds: [a], linkIds: [cascaded, independent], frameIds: [frameId] });
    expect(store.current().stickies.map((s) => s.id)).toEqual([b, c, d]);
    expect(store.current().links).toEqual([]);
    expect(store.current().frames).toEqual([]);
    store.undo();
    expect(store.current().stickies).toHaveLength(4);
    expect(store.current().links.map((l) => l.id).sort()).toEqual([cascaded, independent].sort());
    expect(store.current().frames.map((f) => f.id)).toEqual([frameId]);
  });

  it("supprime uniquement des liens ou des cadres, sans post-it", () => {
    const { store, place, linkOf, frameId } = setup();
    const link = linkOf(place(0), place(300));
    new DeleteSelection(store).execute({ stickyIds: [], linkIds: [link], frameIds: [frameId] });
    expect([store.current().stickies.length, store.current().links.length, store.current().frames.length]).toEqual([2, 0, 0]);
  });
});
