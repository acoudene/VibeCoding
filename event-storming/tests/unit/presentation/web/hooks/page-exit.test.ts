import { describe, expect, it } from "vitest";
import type { SyncStatus } from "../../../../../src/application/ports/board-sync";
import { commitOpenEditor, shouldWarnBeforeUnload } from "../../../../../src/presentation/web/hooks/page-exit";

function element(tag: string) {
  const el = { blurred: 0, matches: (selector: string) => selector.split(", ").includes(tag), blur: () => (el.blurred += 1) };
  return el;
}

describe("shouldWarnBeforeUnload", () => {
  it.each<[SyncStatus, boolean]>([
    ["saved", false],
    ["saving", true],
    ["offline", true],
    ["error", true],
  ])("état %s → prévenir : %s", (status, expected) => {
    expect(shouldWarnBeforeUnload(status)).toBe(expected);
  });
});

describe("commitOpenEditor", () => {
  it.each(["input", "textarea"])("quitte le champ de saisie %s ouvert : son texte est enregistré (au blur)", (tag) => {
    const el = element(tag);
    commitOpenEditor(el);
    expect(el.blurred).toBe(1);
  });

  it("laisse le focus d'un élément qui n'est pas un champ de saisie", () => {
    const el = element("button");
    commitOpenEditor(el);
    expect(el.blurred).toBe(0);
  });

  it("ne fait rien sans élément actif", () => {
    expect(() => commitOpenEditor(null)).not.toThrow();
  });
});
