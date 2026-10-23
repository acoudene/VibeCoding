import { describe, expect, it } from "vitest";
import { isPlainLeftClick } from "../../../../src/presentation/web/link-click";

const plain = { button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false };

describe("isPlainLeftClick", () => {
  it("accepte un clic gauche sans touche de modification", () => {
    expect(isPlainLeftClick(plain)).toBe(true);
  });
  it("laisse au navigateur les clics Ctrl, Cmd, Maj, Alt et ceux des autres boutons", () => {
    expect(isPlainLeftClick({ ...plain, ctrlKey: true })).toBe(false);
    expect(isPlainLeftClick({ ...plain, metaKey: true })).toBe(false);
    expect(isPlainLeftClick({ ...plain, shiftKey: true })).toBe(false);
    expect(isPlainLeftClick({ ...plain, altKey: true })).toBe(false);
    expect(isPlainLeftClick({ ...plain, button: 1 })).toBe(false);
  });
});
