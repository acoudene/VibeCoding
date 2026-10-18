import { describe, expect, it } from "vitest";
import { memberPositionsDuringDrag, syncFrameNodes } from "../../../../../src/presentation/web/canvas/frame-nodes";
import { frame, makeBoard, sticky } from "../board-fixture";

describe("syncFrameNodes", () => {
  it("crée un nœud cadre sous les post-its, déplaçable par son titre, au fond traversable, à la taille du cadre", () => {
    const nodes = syncFrameNodes([], makeBoard({ frames: [frame("f1", { rect: { x: 10, y: 20, width: 500, height: 300 } })] }));
    expect(nodes).toEqual([
      {
        id: "f1",
        type: "frame",
        position: { x: 10, y: 20 },
        width: 500,
        height: 300,
        zIndex: 0,
        dragHandle: ".frame-node__title",
        style: { pointerEvents: "none" },
        selected: false,
        ariaLabel: "Cadre : Contexte 1",
        data: { name: "Contexte 1", editing: false },
      },
    ]);
  });

  it("met en édition le nom du cadre édité", () => {
    const nodes = syncFrameNodes([], makeBoard({ frames: [frame("f1"), frame("f2")] }), "f2");
    expect(nodes.map((n) => n.data.editing)).toEqual([false, true]);
  });

  it("suit le tableau en conservant la sélection et réutilise le nœud inchangé", () => {
    const board = makeBoard({ frames: [frame("f1")] });
    const [first] = syncFrameNodes([], board);
    if (first === undefined) throw new Error("nœud attendu");
    const selected = { ...first, selected: true };
    expect(syncFrameNodes([selected], board)[0]).toBe(selected);
    const [renamed] = syncFrameNodes([selected], makeBoard({ frames: [frame("f1", { name: "Paiement" })] }));
    expect([renamed?.selected, renamed?.data.name]).toEqual([true, "Paiement"]);
  });

  it("reprend la taille du tableau après un redimensionnement", () => {
    const [first] = syncFrameNodes([], makeBoard({ frames: [frame("f1")] }));
    if (first === undefined) throw new Error("nœud attendu");
    const resized = makeBoard({ frames: [frame("f1", { rect: { x: -5, y: 0, width: 600, height: 200 } })] });
    const [node] = syncFrameNodes([{ ...first, width: 999 }], resized);
    expect([node?.position, node?.width, node?.height]).toEqual([{ x: -5, y: 0 }, 600, 200]);
  });
});

describe("memberPositionsDuringDrag", () => {
  it("décale avec le cadre glissé les post-its qui lui appartiennent (centre dans le cadre, le plus petit cadre)", () => {
    const board = makeBoard({
      frames: [
        frame("big", { rect: { x: 0, y: 0, width: 1000, height: 1000 } }),
        frame("small", { rect: { x: 0, y: 0, width: 300, height: 300 } }),
      ],
      stickies: [
        sticky("inSmall", { position: { x: 10, y: 10 } }),
        sticky("inBigOnly", { position: { x: 500, y: 500 } }),
        sticky("outside", { position: { x: 2000, y: 0 } }),
      ],
    });
    expect(memberPositionsDuringDrag(board, "big", { x: 50, y: -10 })).toEqual(new Map([["inBigOnly", { x: 550, y: 490 }]]));
    expect(memberPositionsDuringDrag(board, "small", { x: 5, y: 5 })).toEqual(new Map([["inSmall", { x: 15, y: 15 }]]));
  });

  it("ne déplace rien pour un cadre inconnu", () => {
    expect(memberPositionsDuringDrag(makeBoard(), "gone", { x: 5, y: 5 })).toEqual(new Map());
  });
});
