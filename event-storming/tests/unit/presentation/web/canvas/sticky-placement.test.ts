import { describe, expect, it } from "vitest";
import { stickyPositionCenteredOn } from "../../../../../src/presentation/web/canvas/sticky-placement";

describe("stickyPositionCenteredOn", () => {
  it("renvoie le coin haut-gauche d'un post-it 160×160 centré sur le point cliqué", () => {
    expect(stickyPositionCenteredOn({ x: 400, y: 300 })).toEqual({ x: 320, y: 220 });
  });
});
