import { describe, expect, it } from "vitest";
import { boardShortcut } from "../../../../../src/presentation/web/canvas/board-shortcuts";

const key = (k: string, modifiers: { ctrl?: boolean; meta?: boolean; shift?: boolean; alt?: boolean } = {}) => ({
  key: k,
  ctrlKey: modifiers.ctrl ?? false,
  metaKey: modifiers.meta ?? false,
  shiftKey: modifiers.shift ?? false,
  altKey: modifiers.alt ?? false,
});

describe("boardShortcut", () => {
  it("Suppr et Retour arrière suppriment la sélection", () => {
    expect(boardShortcut(key("Delete"))).toBe("delete");
    expect(boardShortcut(key("Backspace"))).toBe("delete");
  });

  it("Ctrl ou Cmd + D, C, V dupliquent, copient, collent", () => {
    expect(boardShortcut(key("d", { ctrl: true }))).toBe("duplicate");
    expect(boardShortcut(key("c", { meta: true }))).toBe("copy");
    expect(boardShortcut(key("v", { ctrl: true }))).toBe("paste");
    expect(boardShortcut(key("D", { ctrl: true }))).toBe("duplicate");
  });

  it("Ctrl+Z annule ; Ctrl+Y et Ctrl+Maj+Z rétablissent", () => {
    expect(boardShortcut(key("z", { ctrl: true }))).toBe("undo");
    expect(boardShortcut(key("y", { ctrl: true }))).toBe("redo");
    expect(boardShortcut(key("Z", { ctrl: true, shift: true }))).toBe("redo");
    expect(boardShortcut(key("z", { meta: true, shift: true }))).toBe("redo");
  });

  it("ignore les autres touches, les lettres sans Ctrl/Cmd et les combinaisons avec Alt", () => {
    expect(boardShortcut(key("d"))).toBeUndefined();
    expect(boardShortcut(key("z"))).toBeUndefined();
    expect(boardShortcut(key("x", { ctrl: true }))).toBeUndefined();
    expect(boardShortcut(key("z", { ctrl: true, alt: true }))).toBeUndefined();
    expect(boardShortcut(key("Delete", { ctrl: true }))).toBeUndefined();
  });
});
