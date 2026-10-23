import { describe, expect, it } from "vitest";
import { DrawFrame } from "../../../../src/application/board/draw-frame";
import { MoveElements } from "../../../../src/application/board/move-elements";
import { PlaceSticky } from "../../../../src/application/board/place-sticky";
import { boardId } from "../../../../src/domain/board/board";
import { InMemoryBoardStore } from "../../../../src/infrastructure/memory/in-memory-board-store";
import { ScriptedIdGenerator } from "../../../../src/infrastructure/memory/scripted-id-generator";

function setup() {
  const store = new InMemoryBoardStore();
  store.load(boardId("b-1"), new Uint8Array());
  const ids = new ScriptedIdGenerator();
  const place = (x: number, y: number) => new PlaceSticky(store, ids).execute({ kind: "DomainEvent", position: { x, y } }).id;
  return { store, ids, place, move: new MoveElements(store) };
}

describe("MoveElements", () => {
  it("déplace plusieurs post-its en une seule étape d'annulation", () => {
    const { store, place, move } = setup();
    const a = place(0, 0);
    const b = place(300, 0);
    move.execute({ stickies: [{ id: a, to: { x: 10, y: 20 } }, { id: b, to: { x: 310, y: 20 } }], frames: [] });
    expect(store.current().sticky(a)?.position).toEqual({ x: 10, y: 20 });
    expect(store.current().sticky(b)?.position).toEqual({ x: 310, y: 20 });
    store.undo();
    expect(store.current().sticky(a)?.position).toEqual({ x: 0, y: 0 });
    expect(store.current().sticky(b)?.position).toEqual({ x: 300, y: 0 });
  });

  it("déplace un cadre (avec ses membres) et des post-its sélectionnés en une seule étape d'annulation", () => {
    const { store, ids, place, move } = setup();
    const frameId = new DrawFrame(store, ids).execute({ rect: { x: 0, y: 0, width: 800, height: 600 } }).id;
    const member = place(100, 100);
    const outside = place(1000, 0);
    move.execute({ stickies: [{ id: outside, to: { x: 1050, y: 30 } }], frames: [{ id: frameId, dx: 50, dy: 30 }] });
    expect(store.current().frames[0]?.rect).toEqual({ x: 50, y: 30, width: 800, height: 600 });
    expect(store.current().sticky(member)?.position).toEqual({ x: 150, y: 130 });
    expect(store.current().sticky(outside)?.position).toEqual({ x: 1050, y: 30 });
    store.undo();
    expect(store.current().frames[0]?.rect.x).toBe(0);
    expect(store.current().sticky(member)?.position).toEqual({ x: 100, y: 100 });
    expect(store.current().sticky(outside)?.position).toEqual({ x: 1000, y: 0 });
  });

  it("ne déplace pas deux fois un post-it à la fois sélectionné et membre du cadre déplacé", () => {
    const { store, ids, place, move } = setup();
    const frameId = new DrawFrame(store, ids).execute({ rect: { x: 0, y: 0, width: 800, height: 600 } }).id;
    const member = place(100, 100);
    move.execute({ stickies: [{ id: member, to: { x: 150, y: 130 } }], frames: [{ id: frameId, dx: 50, dy: 30 }] });
    expect(store.current().sticky(member)?.position).toEqual({ x: 150, y: 130 });
  });

  it("n'enregistre aucune étape quand rien ne bouge", () => {
    const { store, place, move } = setup();
    place(0, 0);
    const a = place(10, 10);
    move.execute({ stickies: [{ id: a, to: { x: 10, y: 10 } }], frames: [] });
    store.undo();
    expect(store.current().stickies).toHaveLength(1);
  });
});
