import { describe, expect, it } from "vitest";
import { STICKY_FONT_SIZES, stickyFontSize } from "../../../../../src/presentation/web/canvas/sticky-font";

describe("stickyFontSize", () => {
  it("utilise la plus grande police pour un texte court ou vide", () => {
    expect(stickyFontSize("")).toBe(STICKY_FONT_SIZES[0]);
    expect(stickyFontSize("Commande passée")).toBe(STICKY_FONT_SIZES[0]);
  });
  it("rétrécit par paliers quand le texte s'allonge", () => {
    const sizes = [10, 40, 80, 150, 300].map((length) => stickyFontSize("a".repeat(length)));
    for (let i = 1; i < sizes.length; i += 1) expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1] ?? 0);
    expect(sizes[0]).toBeGreaterThan(sizes[sizes.length - 1] ?? Infinity);
  });
  it("ne descend jamais sous le plus petit palier", () => {
    expect(stickyFontSize("a".repeat(5000))).toBe(STICKY_FONT_SIZES[STICKY_FONT_SIZES.length - 1]);
  });
  it("ignore les espaces en début et en fin de texte", () => {
    expect(stickyFontSize(`  ${"a".repeat(10)}${" ".repeat(100)}`)).toBe(stickyFontSize("a".repeat(10)));
  });
  it("tient compte des retours à la ligne : un texte court sur plusieurs lignes rétrécit aussi", () => {
    const sixLines = ["a", "b", "c", "d", "e", "f"].join("\n");
    expect(stickyFontSize(sixLines)).toBeLessThan(STICKY_FONT_SIZES[0]);
    expect(stickyFontSize(Array(12).fill("a").join("\n"))).toBeLessThan(stickyFontSize(sixLines));
  });
  it("ignore les lignes vides en début et en fin de texte", () => {
    expect(stickyFontSize("\n\n\nPayé\n\n\n\n\n")).toBe(stickyFontSize("Payé"));
  });
});
