import { describe, expect, it } from "vitest";
import { position } from "../../../../src/domain/board/geometry";
import { STICKY_SIZE, stickyCenter } from "../../../../src/domain/board/sticky";

describe("Sticky", () => {
  it("a une taille fixe de 160 × 160", () => expect(STICKY_SIZE).toEqual({ width: 160, height: 160 }));
  it("a pour centre sa position (coin haut-gauche) plus la moitié de sa taille", () =>
    expect(stickyCenter({ position: position(100, 40) })).toEqual({ x: 180, y: 120 }));
});
