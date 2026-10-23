import { describe, expect, it } from "vitest";
import { DrawFrame } from "../../../../src/application/board/draw-frame";
import { EditFrame } from "../../../../src/application/board/edit-frame";
import { PlaceSticky } from "../../../../src/application/board/place-sticky";
import { boardId } from "../../../../src/domain/board/board";
import { InMemoryBoardStore } from "../../../../src/infrastructure/memory/in-memory-board-store";
import { ScriptedIdGenerator } from "../../../../src/infrastructure/memory/scripted-id-generator";

function setup() {
  const store = new InMemoryBoardStore();
  store.load(boardId("b-1"), new Uint8Array());
  const ids = new ScriptedIdGenerator();
  const { id } = new DrawFrame(store, ids).execute({ rect: { x: 0, y: 0, width: 800, height: 600 } });
  return { store, ids, frameId: id, edit: new EditFrame(store) };
}

describe("DrawFrame", () => {
  it("dessine un cadre nommé « Contexte 1 » et renvoie son identifiant", () => {
    const { store, frameId } = setup();
    expect(store.current().frames).toEqual([{ id: frameId, name: "Contexte 1", rect: { x: 0, y: 0, width: 800, height: 600 } }]);
  });

  it("est annulable en une étape", () => {
    const { store } = setup();
    store.undo();
    expect(store.current().frames).toEqual([]);
  });
});

describe("EditFrame", () => {
  it("renomme", () => {
    const { store, frameId, edit } = setup();
    edit.execute({ frameId, action: "rename", name: "Livraison" });
    expect(store.current().frames[0]?.name).toBe("Livraison");
  });

  it("redimensionne", () => {
    const { store, frameId, edit } = setup();
    edit.execute({ frameId, action: "resize", rect: { x: 0, y: 0, width: 1000, height: 600 } });
    expect(store.current().frames[0]?.rect.width).toBe(1000);
  });

  it("déplace le cadre et ses post-its en une seule étape d'annulation", () => {
    const { store, ids, frameId, edit } = setup();
    const sticky = new PlaceSticky(store, ids).execute({ kind: "DomainEvent", position: { x: 320, y: 220 } }).id;
    edit.execute({ frameId, action: "move", dx: 100, dy: 50 });
    expect(store.current().sticky(sticky)?.position).toEqual({ x: 420, y: 270 });
    store.undo();
    expect(store.current().sticky(sticky)?.position).toEqual({ x: 320, y: 220 });
    expect(store.current().frames[0]?.rect.x).toBe(0);
  });

  it("supprime en conservant les post-its", () => {
    const { store, ids, frameId, edit } = setup();
    new PlaceSticky(store, ids).execute({ kind: "DomainEvent", position: { x: 320, y: 220 } });
    edit.execute({ frameId, action: "remove" });
    expect(store.current().frames).toEqual([]);
    expect(store.current().stickies).toHaveLength(1);
  });
});
