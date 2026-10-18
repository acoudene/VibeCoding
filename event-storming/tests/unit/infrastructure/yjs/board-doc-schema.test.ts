import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { Board, boardId } from "../../../../src/domain/board/board";
import type { BoardChange } from "../../../../src/domain/board/board-change";
import { applyChanges, LOCAL_ORIGIN, readBoard } from "../../../../src/infrastructure/yjs/board-doc-schema";
import { sequentialIds } from "../../domain/board/sequential-ids";

const id = boardId("b-1");

/** Tableau d'exemple et les modifications qui l'ont construit, action par action. */
function sample(): { board: Board; actions: BoardChange[][] } {
  const ids = sequentialIds();
  let board = Board.create(id);
  const actions: BoardChange[][] = [];
  const steps = [
    (b: Board) => b.rename("Atelier"),
    (b: Board) => b.addSticky({ kind: "Command", position: { x: 0, y: 0 }, label: "Passer commande", notes: "n" }, ids),
    (b: Board) => b.addSticky({ kind: "Aggregate", position: { x: 300, y: 20 }, identifier: "AGG-1" }, ids),
    (b: Board) => b.addLink("id-1", "id-2", ids),
    (b: Board) => b.addFrame({ x: -10, y: -10, width: 800, height: 400 }, ids),
  ];
  for (const step of steps) {
    const result = step(board);
    actions.push(result.changes);
    board = result.board;
  }
  return { board, actions };
}

function sampleBoard(): Board {
  return sample().board;
}

function sampleDoc(): Y.Doc {
  const doc = new Y.Doc();
  for (const changes of sample().actions) applyChanges(doc, changes);
  return doc;
}

describe("schéma du Y.Doc d'un tableau", () => {
  it("lit un document vide comme un tableau neuf", () => {
    expect(readBoard(id, new Y.Doc())).toEqual(Board.create(id));
  });

  it("aller-retour sans perte : tableau → Y.Doc → tableau identique", () => {
    expect(readBoard(id, sampleDoc())).toEqual(sampleBoard());
  });

  it("une mise à jour Yjs appliquée à un second Y.Doc reconstruit le même tableau", () => {
    const second = new Y.Doc();
    Y.applyUpdate(second, Y.encodeStateAsUpdate(sampleDoc()));
    expect(readBoard(id, second)).toEqual(sampleBoard());
  });

  it("suit le schéma du plan (meta, stickies, links, frames)", () => {
    const doc = sampleDoc();
    expect(doc.getMap("meta").toJSON()).toEqual({ name: "Atelier" });
    expect(doc.getMap("stickies").toJSON()).toEqual({
      "id-1": { kind: "Command", label: "Passer commande", notes: "n", x: 0, y: 0 },
      "id-2": { kind: "Aggregate", label: "", identifier: "AGG-1", notes: "", x: 300, y: 20 },
    });
    expect(doc.getMap("links").toJSON()).toEqual({ "id-3": { sourceId: "id-1", targetId: "id-2" } });
    expect(doc.getMap("frames").toJSON()).toEqual({
      "id-4": { name: "Contexte 1", x: -10, y: -10, width: 800, height: 400 },
    });
  });

  it("applique les modifications dans une seule transaction d'origine locale", () => {
    const doc = new Y.Doc();
    const origins: unknown[] = [];
    doc.on("afterTransaction", (transaction) => origins.push(transaction.origin));
    const ids = sequentialIds();
    applyChanges(doc, Board.create(id).addSticky({ kind: "Command", position: { x: 0, y: 0 } }, ids).changes);
    expect(origins).toEqual([LOCAL_ORIGIN]);
  });

  it("ignore les entrées mal formées d'un document reçu", () => {
    const doc = sampleDoc();
    doc.transact(() => {
      doc.getMap("meta").set("name", 42);
      const stickies = doc.getMap("stickies");
      stickies.set("not-a-map", "texte");
      stickies.set("bad-kind", new Y.Map<unknown>([["kind", "Unknown"], ["label", ""], ["notes", ""], ["x", 0], ["y", 0]]));
      stickies.set("no-position", new Y.Map<unknown>([["kind", "Command"], ["label", ""], ["notes", ""]]));
      stickies.set("nan", new Y.Map<unknown>([["kind", "Command"], ["label", ""], ["notes", ""], ["x", Number.NaN], ["y", 0]]));
      stickies.set("bad-id", new Y.Map<unknown>([["kind", "Command"], ["label", ""], ["notes", ""], ["identifier", 1], ["x", 0], ["y", 0]]));
      const links = doc.getMap("links");
      links.set("dangling", new Y.Map<unknown>([["sourceId", "id-1"], ["targetId", "missing"]]));
      links.set("self", new Y.Map<unknown>([["sourceId", "id-1"], ["targetId", "id-1"]]));
      links.set("bad-link", new Y.Map<unknown>([["sourceId", 1], ["targetId", "id-2"]]));
      const frames = doc.getMap("frames");
      frames.set("flat", new Y.Map<unknown>([["name", "Plat"], ["x", 0], ["y", 0], ["width", 0], ["height", 10]]));
      frames.set("no-name", new Y.Map<unknown>([["x", 0], ["y", 0], ["width", 10], ["height", 10]]));
    });
    const board = readBoard(id, doc);
    const expected = sampleBoard();
    expect(board.name).toBe("Tableau sans titre");
    expect([board.stickies, board.links, board.frames]).toEqual([expected.stickies, expected.links, expected.frames]);
  });
});
