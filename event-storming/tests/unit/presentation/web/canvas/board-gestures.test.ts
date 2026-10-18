import { describe, expect, it } from "vitest";
import type { EditFrameCommand } from "../../../../../src/application/board/edit-frame";
import type { EditStickyCommand } from "../../../../../src/application/board/edit-sticky";
import type { LinkStickiesCommand } from "../../../../../src/application/board/link-stickies";
import type { MoveStickyCommand } from "../../../../../src/application/board/move-sticky";
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
  it("enregistre une seule fois la fin du glissement : cadres d'abord (les membres suivent), puis post-its", () => {
    const board = makeBoard({ stickies: [sticky("s1")], frames: [frame("f1", { rect: { x: 0, y: 0, width: 400, height: 300 } })] });
    const order: string[] = [];
    const moveSticky = recorder<MoveStickyCommand>(undefined);
    const editFrame = recorder<EditFrameCommand>(undefined);
    commitDrag(
      {
        board,
        moveSticky: { execute: (c) => (order.push("sticky"), moveSticky.execute(c)) },
        editFrame: { execute: (c) => (order.push("frame"), editFrame.execute(c)) },
      },
      [
        { id: "s1", type: "sticky", position: { x: 50, y: 60 } },
        { id: "f1", type: "frame", position: { x: 30, y: -20 } },
      ],
    );
    expect(order).toEqual(["frame", "sticky"]);
    expect(editFrame.commands).toEqual([{ frameId: "f1", action: "move", dx: 30, dy: -20 }]);
    expect(moveSticky.commands).toEqual([{ id: "s1", to: { x: 50, y: 60 } }]);
  });

  it("n'enregistre rien pour un cadre laissé en place ou disparu", () => {
    const board = makeBoard({ frames: [frame("f1")] });
    const editFrame = recorder<EditFrameCommand>(undefined);
    commitDrag({ board, moveSticky: recorder<MoveStickyCommand>(undefined), editFrame }, [
      { id: "f1", type: "frame", position: { x: 0, y: 0 } },
      { id: "gone", type: "frame", position: { x: 5, y: 5 } },
    ]);
    expect(editFrame.commands).toEqual([]);
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
