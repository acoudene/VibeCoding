import { describe, expect, it } from "vitest";
import { InvalidRectError } from "../../../../src/domain/board/errors";
import { position, rect, rectArea, rectContains } from "../../../../src/domain/board/geometry";

describe("position / rect", () => {
  it("crée une position", () => expect(position(3, -4)).toEqual({ x: 3, y: -4 }));
  it("crée un rectangle valide", () => expect(rect(1, 2, 30, 40)).toEqual({ x: 1, y: 2, width: 30, height: 40 }));
  it.each([[0, 10], [10, 0], [-1, 10], [10, -5]])("refuse width=%d height=%d", (w, h) => {
    expect(() => rect(0, 0, w, h)).toThrow(InvalidRectError);
  });
  it("calcule l'aire", () => expect(rectArea(rect(0, 0, 3, 4))).toBe(12));
  it("contient un point intérieur et les bords (inclus)", () => {
    const r = rect(10, 10, 100, 50);
    expect(rectContains(r, position(50, 30))).toBe(true);
    expect(rectContains(r, position(10, 10))).toBe(true);
    expect(rectContains(r, position(110, 60))).toBe(true);
  });
  it("ne contient pas un point extérieur", () => {
    const r = rect(10, 10, 100, 50);
    expect(rectContains(r, position(9, 30))).toBe(false);
    expect(rectContains(r, position(111, 30))).toBe(false);
    expect(rectContains(r, position(50, 61))).toBe(false);
  });
});
