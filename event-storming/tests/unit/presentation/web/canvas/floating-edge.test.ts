import { describe, expect, it } from "vitest";
import { floatingEdgeEnds } from "../../../../../src/presentation/web/canvas/floating-edge";

const at = (x: number, y: number) => ({ x, y, width: 160, height: 160 });

describe("floatingEdgeEnds", () => {
  it("relie le côté droit de la source au côté gauche d'une cible située à droite", () => {
    expect(floatingEdgeEnds(at(0, 0), at(400, 0))).toEqual({
      sourceX: 160,
      sourceY: 80,
      sourcePosition: "right",
      targetX: 400,
      targetY: 80,
      targetPosition: "left",
    });
  });

  it("inverse les côtés quand la cible est à gauche", () => {
    const ends = floatingEdgeEnds(at(400, 0), at(0, 30));
    expect([ends.sourcePosition, ends.sourceX, ends.sourceY]).toEqual(["left", 400, 80]);
    expect([ends.targetPosition, ends.targetX, ends.targetY]).toEqual(["right", 160, 110]);
  });

  it("relie le bas de la source au haut d'une cible située dessous", () => {
    const ends = floatingEdgeEnds(at(0, 0), at(50, 400));
    expect([ends.sourcePosition, ends.sourceX, ends.sourceY]).toEqual(["bottom", 80, 160]);
    expect([ends.targetPosition, ends.targetX, ends.targetY]).toEqual(["top", 130, 400]);
  });

  it("relie le haut de la source au bas d'une cible située dessus", () => {
    const ends = floatingEdgeEnds(at(0, 400), at(0, 0));
    expect([ends.sourcePosition, ends.targetPosition]).toEqual(["top", "bottom"]);
  });

  it("choisit l'axe où l'écart entre les centres est le plus grand (en diagonale)", () => {
    expect(floatingEdgeEnds(at(0, 0), at(300, 200)).sourcePosition).toBe("right");
    expect(floatingEdgeEnds(at(0, 0), at(200, 300)).sourcePosition).toBe("bottom");
  });

  it("tient compte de la taille réelle des rectangles", () => {
    const ends = floatingEdgeEnds({ x: 0, y: 0, width: 100, height: 40 }, { x: 300, y: 0, width: 100, height: 40 });
    expect([ends.sourceX, ends.sourceY, ends.targetX, ends.targetY]).toEqual([100, 20, 300, 20]);
  });
});
