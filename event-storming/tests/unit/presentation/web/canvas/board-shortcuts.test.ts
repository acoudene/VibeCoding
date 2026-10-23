import { describe, expect, it } from "vitest";
import { boardShortcut, handleBoardKey, releasesFocusAfterClick } from "../../../../../src/presentation/web/canvas/board-shortcuts";

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

describe("handleBoardKey", () => {
  function actions(handled: boolean) {
    const calls: string[] = [];
    const action = (name: string) => () => (calls.push(name), handled);
    return {
      calls,
      actions: {
        delete: action("delete"),
        duplicate: action("duplicate"),
        copy: action("copy"),
        paste: action("paste"),
        undo: action("undo"),
        redo: action("redo"),
      },
    };
  }

  it("exécute l'action du raccourci et indique si la touche a été traitée (à empêcher côté navigateur)", () => {
    const handled = actions(true);
    expect(handleBoardKey(key("c", { ctrl: true }), false, handled.actions)).toBe(true);
    const unhandled = actions(false);
    expect(handleBoardKey(key("c", { ctrl: true }), false, unhandled.actions)).toBe(false);
    expect(handleBoardKey(key("v", { meta: true }), false, unhandled.actions)).toBe(false);
    expect([handled.calls, unhandled.calls]).toEqual([["copy"], ["copy", "paste"]]);
  });

  it("n'exécute rien pendant une saisie de texte ni pour une touche sans raccourci", () => {
    const { calls, actions: all } = actions(true);
    expect(handleBoardKey(key("Backspace"), true, all)).toBe(false);
    expect(handleBoardKey(key("a", { ctrl: true }), false, all)).toBe(false);
    expect(calls).toEqual([]);
  });
});

describe("releasesFocusAfterClick", () => {
  it("rend le focus après un clic de souris sur un bouton (Espace + glisser ne le réactive pas)", () => {
    expect(releasesFocusAfterClick({ isButton: true, clickCount: 1 })).toBe(true);
  });

  it("garde le focus après une activation au clavier (detail = 0) ou hors bouton", () => {
    expect(releasesFocusAfterClick({ isButton: true, clickCount: 0 })).toBe(false);
    expect(releasesFocusAfterClick({ isButton: false, clickCount: 1 })).toBe(false);
  });
});
