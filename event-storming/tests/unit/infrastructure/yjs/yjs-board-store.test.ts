import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import type { BoardUpdate } from "../../../../src/application/ports/board-store";
import { boardId } from "../../../../src/domain/board/board";
import { readBoard } from "../../../../src/infrastructure/yjs/board-doc-schema";
import { YjsBoardStore } from "../../../../src/infrastructure/yjs/yjs-board-store";
import { sequentialIds } from "../../domain/board/sequential-ids";
import { describeBoardStoreContract } from "../board-store-contract";

/** Les mises à jour Yjs sont des deltas : le serveur les fusionne pour obtenir l'état complet. */
describeBoardStoreContract("YjsBoardStore", {
  create: () => new YjsBoardStore(),
  encodedStateAfter: (updates) => Y.mergeUpdates([...updates]),
});

const id = boardId("b-1");

describe("YjsBoardStore", () => {
  it("ouvre l'état Yjs complet renvoyé par le serveur", () => {
    const server = new Y.Doc();
    const store = new YjsBoardStore();
    store.load(id, new Uint8Array());
    store.onUpdate((u) => Y.applyUpdate(server, u));
    store.apply(store.current().rename("Atelier").changes);

    const reopened = new YjsBoardStore();
    reopened.load(id, Y.encodeStateAsUpdate(server));
    expect(reopened.current()).toEqual(store.current());
  });

  it("émet des mises à jour Yjs que le serveur fusionne, annulation comprise", () => {
    const server = new Y.Doc();
    const store = new YjsBoardStore();
    store.load(id, Y.encodeStateAsUpdate(new Y.Doc()));
    store.onUpdate((u) => Y.applyUpdate(server, u));
    const ids = sequentialIds();
    store.apply(store.current().addSticky({ kind: "Command", position: { x: 0, y: 0 } }, ids).changes);
    store.apply(store.current().updateSticky("id-1", { label: "Passer commande" }).changes);
    store.undo();
    expect(readBoard(id, server)).toEqual(store.current());
  });

  it("refuse un état illisible", () => {
    expect(() => new YjsBoardStore().load(id, new Uint8Array([1, 2, 3]))).toThrow();
  });

  it("des actions successives sans délai restent des étapes distinctes", () => {
    const store = new YjsBoardStore();
    store.load(id, new Uint8Array());
    const updates: BoardUpdate[] = [];
    store.onUpdate((u) => updates.push(u));
    for (const label of ["A", "B", "C", "D"]) {
      store.apply(store.current().addSticky({ kind: "DomainEvent", position: { x: 0, y: 0 }, label }, sequentialIds(label)).changes);
    }
    store.undo();
    store.undo();
    expect(store.current().stickies.map((s) => s.label)).toEqual(["A", "B"]);
  });
});
