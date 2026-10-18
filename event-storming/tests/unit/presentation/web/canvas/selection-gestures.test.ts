import { describe, expect, it } from "vitest";
import type { DeleteSelectionCommand } from "../../../../../src/application/board/delete-selection";
import type { EditFrameCommand } from "../../../../../src/application/board/edit-frame";
import type { EditLinkCommand } from "../../../../../src/application/board/edit-link";
import type { Board } from "../../../../../src/domain/board/board";
import {
  deleteSelected,
  pastePoint,
  selectionOf,
  selectOnly,
} from "../../../../../src/presentation/web/canvas/selection-gestures";
import { frame, link, makeBoard, sticky } from "../board-fixture";

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
  it("supprime les post-its (et leurs liens), puis les liens et cadres sélectionnés encore présents", () => {
    let board: Board = makeBoard({
      stickies: [sticky("a"), sticky("b"), sticky("c")],
      links: [link("l1", "a", "b"), link("l2", "b", "c")],
      frames: [frame("f1")],
    });
    const calls: string[] = [];
    deleteSelected(
      {
        currentBoard: () => board,
        deleteSelection: {
          execute(command: DeleteSelectionCommand) {
            calls.push(`stickies:${command.stickyIds.join(",")}`);
            board = makeBoard({ stickies: [sticky("b"), sticky("c")], links: [link("l2", "b", "c")], frames: [frame("f1")] });
          },
        },
        editLink: { execute: (command: EditLinkCommand) => void calls.push(`link:${command.linkId}:${command.action}`) },
        editFrame: { execute: (command: EditFrameCommand) => void calls.push(`frame:${command.frameId}:${command.action}`) },
      },
      { stickyIds: ["a"], linkIds: ["l1", "l2"], frameIds: ["f1", "gone"] },
    );
    expect(calls).toEqual(["stickies:a", "link:l2:remove", "frame:f1:remove"]);
  });

  it("ne fait rien sans sélection", () => {
    const calls: string[] = [];
    const record = { execute: () => void calls.push("call") };
    deleteSelected(
      { currentBoard: () => makeBoard(), deleteSelection: record, editLink: record, editFrame: record },
      { stickyIds: [], linkIds: [], frameIds: [] },
    );
    expect(calls).toEqual([]);
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
