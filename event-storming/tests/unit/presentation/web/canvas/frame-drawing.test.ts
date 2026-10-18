import { describe, expect, it } from "vitest";
import { MIN_FRAME_DRAG, isFrameDrag, rectBetween } from "../../../../../src/presentation/web/canvas/frame-drawing";

describe("rectBetween", () => {
  it("normalise le rectangle quel que soit le sens du glissement", () => {
    expect(rectBetween({ x: 10, y: 20 }, { x: 110, y: 70 })).toEqual({ x: 10, y: 20, width: 100, height: 50 });
    expect(rectBetween({ x: 110, y: 70 }, { x: 10, y: 20 })).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });
});

describe("isFrameDrag", () => {
  it("ignore un simple clic ou un glissement trop court sur un axe", () => {
    expect(isFrameDrag({ x: 0, y: 0, width: 0, height: 0 })).toBe(false);
    expect(isFrameDrag({ x: 0, y: 0, width: 200, height: MIN_FRAME_DRAG - 1 })).toBe(false);
    expect(isFrameDrag({ x: 0, y: 0, width: MIN_FRAME_DRAG, height: MIN_FRAME_DRAG })).toBe(true);
  });
});
