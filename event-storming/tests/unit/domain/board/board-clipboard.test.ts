import { describe, expect, it } from "vitest";
import { Board, DUPLICATE_GAP, boardId } from "../../../../src/domain/board/board";
import { UnknownStickyError } from "../../../../src/domain/board/errors";
import { position } from "../../../../src/domain/board/geometry";
import { STICKY_SIZE } from "../../../../src/domain/board/sticky";
import { sequentialIds } from "./sequential-ids";

/** s-1 Command « A » (0,0) id « a », notes « n » ; s-2 DomainEvent « B » (200,0) ; s-3 Actor (0,400) ; l-1 s-1→s-2 ; l-2 s-2→s-3. */
function scene(): Board {
  const sids = sequentialIds("s");
  let board = Board.create(boardId("b1"));
  board = board.addSticky({ kind: "Command", label: "A", identifier: "a", notes: "n", position: position(0, 0) }, sids).board;
  board = board.addSticky({ kind: "DomainEvent", label: "B", position: position(200, 0) }, sids).board;
  board = board.addSticky({ kind: "Actor", position: position(0, 400) }, sids).board;
  const lids = sequentialIds("l");
  board = board.addLink("s-1", "s-2", lids).board;
  return board.addLink("s-2", "s-3", lids).board;
}

describe("Board.duplicate", () => {
  it("copie sous l'original, décalé de STICKY_SIZE.height + DUPLICATE_GAP, avec les mêmes contenus", () => {
    expect(DUPLICATE_GAP).toBe(20);
    const { board, changes, createdIds } = scene().duplicate(["s-1"], sequentialIds("n"));
    expect(createdIds).toEqual(["n-1"]);
    const copy = board.sticky("n-1");
    expect(copy).toEqual({
      id: "n-1", kind: "Command", label: "A", identifier: "a", notes: "n",
      position: position(0, STICKY_SIZE.height + DUPLICATE_GAP),
    });
    expect(changes).toEqual([{ type: "StickyAdded", sticky: copy }]);
  });
  it("copie aussi les liens internes à la sélection, pas les autres", () => {
    const { board, changes, createdIds } = scene().duplicate(["s-1", "s-2"], sequentialIds("n"));
    expect(createdIds).toEqual(["n-1", "n-2"]);
    expect(board.links).toHaveLength(3);
    expect(board.links[2]).toEqual({ id: "n-3", sourceId: "n-1", targetId: "n-2" });
    expect(changes.map((c) => c.type)).toEqual(["StickyAdded", "StickyAdded", "LinkAdded"]);
  });
  it("ne change rien pour une sélection vide", () => {
    const board = scene();
    const result = board.duplicate([], sequentialIds("n"));
    expect(result.board).toBe(board);
    expect(result.changes).toEqual([]);
    expect(result.createdIds).toEqual([]);
  });
  it("refuse un post-it inconnu", () => {
    expect(() => scene().duplicate(["s-1", "nope"], sequentialIds("n"))).toThrow(UnknownStickyError);
  });
});

describe("Board.copy / paste", () => {
  it("copy retient post-its, liens internes et positions relatives au centre de la boîte englobante", () => {
    const fragment = scene().copy(["s-1", "s-2"]);
    // boîte englobante : x 0..360, y 0..160 -> centre (180, 80)
    expect(fragment.stickies).toEqual([
      { kind: "Command", label: "A", identifier: "a", notes: "n", offset: position(-180, -80) },
      { kind: "DomainEvent", label: "B", notes: "", offset: position(20, -80) },
    ]);
    expect(fragment.links).toEqual([{ sourceIndex: 0, targetIndex: 1 }]);
  });
  it("paste recentre le fragment sur le pointeur avec de nouveaux identifiants", () => {
    const board = scene();
    const fragment = board.copy(["s-1", "s-2"]);
    const { board: next, changes, createdIds } = board.paste(fragment, position(1000, 500), sequentialIds("n"));
    expect(createdIds).toEqual(["n-1", "n-2"]);
    expect(next.sticky("n-1")?.position).toEqual(position(820, 420));
    expect(next.sticky("n-2")?.position).toEqual(position(1020, 420));
    expect(next.sticky("n-1")).toMatchObject({ kind: "Command", label: "A", identifier: "a", notes: "n" });
    expect(next.links.at(-1)).toEqual({ id: "n-3", sourceId: "n-1", targetId: "n-2" });
    expect(changes.map((c) => c.type)).toEqual(["StickyAdded", "StickyAdded", "LinkAdded"]);
  });
  it("paste d'un fragment vide ne change rien", () => {
    const board = scene();
    const result = board.paste(board.copy([]), position(0, 0), sequentialIds("n"));
    expect(result.board).toBe(board);
    expect(result.changes).toEqual([]);
    expect(result.createdIds).toEqual([]);
  });
  it("le fragment survit à la suppression des originaux", () => {
    const board = scene();
    const fragment = board.copy(["s-1"]);
    const { board: next } = board.removeStickies(["s-1"]).board.paste(fragment, position(80, 80), sequentialIds("n"));
    expect(next.sticky("n-1")?.position).toEqual(position(0, 0));
  });
  it("copy refuse un post-it inconnu", () => {
    expect(() => scene().copy(["nope"])).toThrow(UnknownStickyError);
  });
});
