import { describe, expect, it } from "vitest";
import type { EditFrameCommand } from "../../../../../src/application/board/edit-frame";
import type { EditStickyCommand } from "../../../../../src/application/board/edit-sticky";
import type { LinkStickiesCommand } from "../../../../../src/application/board/link-stickies";
import type { MoveElementsCommand } from "../../../../../src/application/board/move-elements";
import { EmptyFrameNameError } from "../../../../../src/domain/board/errors";
import {
  commitDrag,
  connectStickies,
  editExistingSticky,
  renameFrame,
} from "../../../../../src/presentation/web/canvas/board-gestures";
import { frame, makeBoard, sticky } from "../board-fixture";

function recorder<C, R = void>(result: R, fail?: (command: C) => Error | undefined) {
  const commands: C[] = [];
  return {
    commands,
    execute(command: C): R {
      const error = fail?.(command);
      if (error !== undefined) throw error;
      commands.push(command);
      return result;
    },
  };
}

describe("editExistingSticky", () => {
  it("modifie le post-it par le cas d'usage", () => {
    const editSticky = recorder<EditStickyCommand>(undefined);
    editExistingSticky({ board: makeBoard({ stickies: [sticky("s1")] }), editSticky }, { id: "s1", label: "Payé" });
    expect(editSticky.commands).toEqual([{ id: "s1", label: "Payé" }]);
  });

  it("ignore la modification d'un post-it supprimé entre-temps (ex. depuis le panneau pendant l'édition)", () => {
    const editSticky = recorder<EditStickyCommand>(undefined);
    expect(() => editExistingSticky({ board: makeBoard(), editSticky }, { id: "s1", label: "Payé" })).not.toThrow();
    expect(editSticky.commands).toEqual([]);
  });
});

describe("connectStickies", () => {
  const board = makeBoard({ stickies: [sticky("a"), sticky("b")] });

  it("relie deux post-its par le cas d'usage et renvoie son résultat", () => {
    const linkStickies = recorder<LinkStickiesCommand, { id: string; outOfGrammar: boolean }>({ id: "l1", outOfGrammar: true });
    expect(connectStickies({ board, linkStickies }, "a", "b")).toEqual({ id: "l1", outOfGrammar: true });
    expect(linkStickies.commands).toEqual([{ sourceId: "a", targetId: "b" }]);
  });

  it("ignore une connexion d'un post-it vers lui-même ou vers autre chose qu'un post-it", () => {
    const linkStickies = recorder<LinkStickiesCommand, { id: string; outOfGrammar: boolean }>({ id: "l1", outOfGrammar: false });
    expect(connectStickies({ board, linkStickies }, "a", "a")).toBeUndefined();
    expect(connectStickies({ board, linkStickies }, "a", "frame")).toBeUndefined();
    expect(linkStickies.commands).toEqual([]);
  });
});

describe("commitDrag", () => {
  it("enregistre la fin du glissement en un seul déplacement groupé : cadres par décalage, post-its par position", () => {
    const board = makeBoard({
      stickies: [sticky("s1"), sticky("s2")],
      frames: [frame("f1", { rect: { x: 0, y: 0, width: 400, height: 300 } })],
    });
    const moveElements = recorder<MoveElementsCommand>(undefined);
    const complete = commitDrag({ board, moveElements }, [
      { id: "s1", type: "sticky", position: { x: 50, y: 60 } },
      { id: "f1", type: "frame", position: { x: 30, y: -20 } },
      { id: "s2", type: "sticky", position: { x: 500, y: 0 } },
    ]);
    expect(complete).toBe(true);
    expect(moveElements.commands).toEqual([
      {
        stickies: [
          { id: "s1", to: { x: 50, y: 60 } },
          { id: "s2", to: { x: 500, y: 0 } },
        ],
        frames: [{ id: "f1", dx: 30, dy: -20 }],
      },
    ]);
  });

  it("n'enregistre rien pour un cadre laissé en place", () => {
    const moveElements = recorder<MoveElementsCommand>(undefined);
    const board = makeBoard({ frames: [frame("f1")] });
    expect(commitDrag({ board, moveElements }, [{ id: "f1", type: "frame", position: { x: 0, y: 0 } }])).toBe(true);
    expect(moveElements.commands).toEqual([]);
  });

  it("ignore les éléments disparus pendant le glissement et le signale (la vue doit être resynchronisée)", () => {
    const moveElements = recorder<MoveElementsCommand>(undefined);
    const complete = commitDrag({ board: makeBoard({ stickies: [sticky("s1")] }), moveElements }, [
      { id: "gone", type: "frame", position: { x: 5, y: 5 } },
      { id: "s1", type: "sticky", position: { x: 10, y: 0 } },
      { id: "gone-too", type: "sticky", position: { x: 5, y: 5 } },
    ]);
    expect(complete).toBe(false);
    expect(moveElements.commands).toEqual([{ stickies: [{ id: "s1", to: { x: 10, y: 0 } }], frames: [] }]);
  });
});

describe("renameFrame", () => {
  const board = makeBoard({ frames: [frame("f1")] });

  it("renomme le cadre par le cas d'usage", () => {
    const editFrame = recorder<EditFrameCommand>(undefined);
    renameFrame({ board, editFrame }, "f1", "Paiement");
    expect(editFrame.commands).toEqual([{ frameId: "f1", action: "rename", name: "Paiement" }]);
  });

  it("garde l'ancien nom quand le domaine refuse un nom vide, et ignore un cadre disparu", () => {
    const editFrame = recorder<EditFrameCommand>(undefined, (c) =>
      c.action === "rename" && c.name.trim() === "" ? new EmptyFrameNameError() : undefined,
    );
    expect(() => renameFrame({ board, editFrame }, "f1", "  ")).not.toThrow();
    renameFrame({ board, editFrame }, "gone", "Paiement");
    expect(editFrame.commands).toEqual([]);
  });
});
