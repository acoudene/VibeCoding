import { describe, expect, it } from "vitest";
import { Board, boardId } from "../../../../src/domain/board/board";
import { SelfLinkError, UnknownLinkError, UnknownStickyError } from "../../../../src/domain/board/errors";
import { position } from "../../../../src/domain/board/geometry";
import type { StickyKind } from "../../../../src/domain/board/sticky-kind";
import { sequentialIds } from "./sequential-ids";

/** Tableau avec un post-it par type donné : s-1, s-2… */
function boardWith(...kinds: StickyKind[]): Board {
  const ids = sequentialIds("s");
  let board = Board.create(boardId("b1"));
  for (const kind of kinds) board = board.addSticky({ kind, position: position(0, 0) }, ids).board;
  return board;
}

/** Tableau avec deux post-its des types donnés reliés de s-1 vers s-2 par l-1. */
const linked = (source: StickyKind, target: StickyKind) =>
  boardWith(source, target).addLink("s-1", "s-2", sequentialIds("l")).board;

describe("Board.addLink", () => {
  it("relie deux post-its et émet LinkAdded", () => {
    const { board, changes } = boardWith("Command", "Aggregate").addLink("s-1", "s-2", sequentialIds("l"));
    const expected = { id: "l-1", sourceId: "s-1", targetId: "s-2" };
    expect(board.links).toEqual([expected]);
    expect(changes).toEqual([{ type: "LinkAdded", link: expected }]);
  });
  it("refuse de relier un post-it à lui-même", () => {
    const board = boardWith("DomainEvent");
    expect(() => board.addLink("s-1", "s-1", sequentialIds("l"))).toThrow(SelfLinkError);
    expect(() => board.addLink("s-1", "s-1", sequentialIds("l"))).toThrow("Un post-it ne peut pas être relié à lui-même");
    expect(board.links).toEqual([]);
  });
  it.each([
    ["source", "nope", "s-1"],
    ["cible", "s-1", "nope"],
  ])("refuse un post-it %s inconnu", (_role, source, target) =>
    expect(() => boardWith("Command").addLink(source, target, sequentialIds("l"))).toThrow(UnknownStickyError));
});

describe("Board.isOutOfGrammar (dérivé, jamais stocké)", () => {
  it("un lien conforme à la grammaire n'est pas hors grammaire", () => {
    const board = linked("Command", "Aggregate");
    expect(board.isOutOfGrammar(board.links[0]!)).toBe(false);
  });
  it("un lien hors grammaire est accepté mais signalé", () => {
    const board = linked("DomainEvent", "Command");
    expect(board.links).toHaveLength(1);
    expect(board.isOutOfGrammar(board.links[0]!)).toBe(true);
  });
  it("est requalifié quand le type d'une extrémité change, sans modifier le lien", () => {
    const { board, changes } = linked("Command", "Aggregate").updateSticky("s-2", { kind: "ReadModel" });
    expect(board.isOutOfGrammar(board.links[0]!)).toBe(true);
    expect(changes.map((c) => c.type)).toEqual(["StickyUpdated"]);
  });
  it("n'est jamais stocké sur le lien", () =>
    expect(linked("DomainEvent", "Command").links[0]).not.toHaveProperty("outOfGrammar"));
  it("refuse un lien dont une extrémité n'est pas sur le tableau", () =>
    expect(() => boardWith("Command").isOutOfGrammar({ id: "x", sourceId: "s-1", targetId: "nope" })).toThrow(
      UnknownStickyError,
    ));
});

describe("Board.reverseLink", () => {
  it("inverse le sens du lien et émet LinkReversed avec le lien complet", () => {
    const { board, changes } = linked("DomainEvent", "Command").reverseLink("l-1");
    const expected = { id: "l-1", sourceId: "s-2", targetId: "s-1" };
    expect(board.links).toEqual([expected]);
    expect(changes).toEqual([{ type: "LinkReversed", link: expected }]);
  });
  it("requalifie le lien inversé", () => {
    const { board } = linked("Command", "Aggregate").reverseLink("l-1");
    expect(board.isOutOfGrammar(board.links[0]!)).toBe(true);
  });
  it("refuse un lien inconnu", () => {
    expect(() => linked("Command", "Aggregate").reverseLink("nope")).toThrow(UnknownLinkError);
    expect(() => linked("Command", "Aggregate").reverseLink("nope")).toThrow("Lien inconnu : nope");
  });
});

describe("Board.removeLink", () => {
  it("supprime le lien, conserve les post-its et émet LinkRemoved", () => {
    const { board, changes } = linked("Command", "Aggregate").removeLink("l-1");
    expect(board.links).toEqual([]);
    expect(board.stickies).toHaveLength(2);
    expect(changes).toEqual([{ type: "LinkRemoved", linkId: "l-1" }]);
  });
  it("refuse un lien inconnu", () => expect(() => linked("Command", "Aggregate").removeLink("nope")).toThrow(UnknownLinkError));
});
