import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { Board, boardId } from "../../../../src/domain/board/board";
import { applyChanges, readBoard } from "../../../../src/infrastructure/yjs/board-doc-schema";
import { YjsBoardHistory } from "../../../../src/infrastructure/yjs/yjs-board-history";
import { sequentialIds } from "../../domain/board/sequential-ids";

const id = boardId("b-1");

function addSticky(doc: Y.Doc, label: string): void {
  applyChanges(
    doc,
    readBoard(id, doc).addSticky({ kind: "DomainEvent", position: { x: 0, y: 0 }, label }, sequentialIds(label)).changes,
  );
}

describe("YjsBoardHistory", () => {
  it("ne suit que les modifications d'origine locale", () => {
    const doc = new Y.Doc();
    const history = new YjsBoardHistory(doc);
    addSticky(doc, "A");
    doc.transact(() => doc.getMap("meta").set("name", "Reçu du serveur"), "remote");
    history.undo();
    const board = readBoard(id, doc);
    expect([board.name, board.stickies]).toEqual(["Reçu du serveur", []]);
    expect(history.canUndo()).toBe(false);
  });

  it("une action locale est une étape, même enchaînée sans délai", () => {
    const doc = new Y.Doc();
    const history = new YjsBoardHistory(doc);
    addSticky(doc, "A");
    addSticky(doc, "B");
    history.undo();
    expect(readBoard(id, doc).stickies.map((s) => s.label)).toEqual(["A"]);
    history.redo();
    expect([readBoard(id, doc).stickies.map((s) => s.label), history.canRedo()]).toEqual([["A", "B"], false]);
  });

  it("ne connaît pas les modifications antérieures à sa création", () => {
    const doc = new Y.Doc();
    applyChanges(doc, Board.create(id).rename("Atelier").changes);
    const history = new YjsBoardHistory(doc);
    expect([history.canUndo(), history.canRedo()]).toEqual([false, false]);
  });
});
