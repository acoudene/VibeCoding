import { describe, expect, it } from "vitest";
import type { DeleteSelectionCommand } from "../../../../../src/application/board/delete-selection";
import {
  deleteSelected,
  pastePoint,
  selectionOf,
  selectOnly,
} from "../../../../../src/presentation/web/canvas/selection-gestures";
import { frame, link, makeBoard, sticky } from "../board-fixture";

function recorder<C>() {
  const commands: C[] = [];
  return { commands, execute: (command: C) => void commands.push(command) };
}

describe("selectionOf", () => {
  it("répartit les éléments sélectionnés en post-its, cadres et liens", () => {
    const nodes = [
      { id: "s1", type: "sticky", selected: true },
      { id: "s2", type: "sticky", selected: false },
      { id: "f1", type: "frame", selected: true },
    ];
    const edges = [{ id: "l1", selected: true }, { id: "l2" }];
    expect(selectionOf(nodes, edges)).toEqual({ stickyIds: ["s1"], frameIds: ["f1"], linkIds: ["l1"] });
  });
});

describe("deleteSelected", () => {
  it("supprime en un seul appel les post-its, liens et cadres sélectionnés encore présents", () => {
    const board = makeBoard({
      stickies: [sticky("a"), sticky("b")],
      links: [link("l1", "a", "b")],
      frames: [frame("f1")],
    });
    const deleteSelection = recorder<DeleteSelectionCommand>();
    deleteSelected({ board, deleteSelection }, { stickyIds: ["a", "gone"], linkIds: ["l1", "gone"], frameIds: ["f1", "gone"] });
    expect(deleteSelection.commands).toEqual([{ stickyIds: ["a"], linkIds: ["l1"], frameIds: ["f1"] }]);
  });

  it("ne fait rien sans sélection (la touche est laissée au navigateur)", () => {
    const deleteSelection = recorder<DeleteSelectionCommand>();
    expect(deleteSelected({ board: makeBoard(), deleteSelection }, { stickyIds: [], linkIds: ["gone"], frameIds: [] })).toBe(false);
    expect(deleteSelection.commands).toEqual([]);
  });

  it("signale qu'il a traité la touche quand il supprime", () => {
    const deleteSelection = recorder<DeleteSelectionCommand>();
    const board = makeBoard({ stickies: [sticky("a")] });
    expect(deleteSelected({ board, deleteSelection }, { stickyIds: ["a"], linkIds: [], frameIds: [] })).toBe(true);
  });
});

describe("selectOnly", () => {
  it("sélectionne exactement les éléments demandés et réutilise ceux qui ne changent pas", () => {
    const kept = { id: "b", selected: false };
    const items = [{ id: "a", selected: false }, kept, { id: "c", selected: true }];
    const next = selectOnly(items, new Set(["a"]));
    expect(next.map((item) => item.selected)).toEqual([true, false, false]);
    expect(next[1]).toBe(kept);
  });
});

describe("pastePoint", () => {
  const pane = { left: 100, top: 50, width: 800, height: 600 };

  it("colle au dernier pointeur connu sur le canevas", () => {
    expect(pastePoint({ x: 300, y: 200 }, pane)).toEqual({ x: 300, y: 200 });
  });

  it("colle au centre de la vue quand le pointeur est inconnu", () => {
    expect(pastePoint(undefined, pane)).toEqual({ x: 500, y: 350 });
  });
});
