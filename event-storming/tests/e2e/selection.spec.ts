import { expect, test, type Page } from "@playwright/test";
import { centerOf, createBoardViaUi, drag, pane, placeSticky, stickies } from "./helpers";

const selected = (page: Page) => page.locator(".react-flow__node-sticky.selected");
const undoButton = (page: Page) => page.getByRole("button", { name: "Annuler" });
const redoButton = (page: Page) => page.getByRole("button", { name: "Rétablir" });

/** Trois post-its alignés : A (400), B (650), C (900) à y = 300. */
async function threeStickies(page: Page) {
  await createBoardViaUi(page);
  const a = await placeSticky(page, "Acteur", { x: 400, y: 300 }, "A");
  const b = await placeSticky(page, "Commande", { x: 650, y: 300 }, "B");
  const c = await placeSticky(page, "Agrégat", { x: 900, y: 300 }, "C");
  return { a, b, c };
}

test.describe("Sélection (FR-040)", () => {
  test("glisser sur une zone vide trace un lasso ; Maj + clic ajoute un post-it", async ({ page }) => {
    const { a, b, c } = await threeStickies(page);
    const posA = await centerOf(a);
    const posB = await centerOf(b);

    // Lasso autour de A et B uniquement, depuis une zone vide.
    await drag(page, { x: posA.x - 130, y: posA.y - 130 }, { x: posB.x + 100, y: posB.y + 130 });
    await expect(selected(page)).toHaveCount(2);
    await expect(a).toHaveClass(/selected/);
    await expect(b).toHaveClass(/selected/);
    await expect(c).not.toHaveClass(/selected/);

    // Clic sur le fond : désélectionne ; Maj + clic : ajoute.
    await pane(page).click({ position: { x: 600, y: 650 } });
    await expect(selected(page)).toHaveCount(0);
    await a.click();
    await c.click({ modifiers: ["Shift"] });
    await expect(selected(page)).toHaveCount(2);
    await expect(b).not.toHaveClass(/selected/);
  });

  test("le lasso ne déplace pas la vue", async ({ page }) => {
    const { a } = await threeStickies(page);
    const before = await centerOf(a);
    await drag(page, { x: 200, y: 500 }, { x: 300, y: 600 });
    expect(await centerOf(a)).toEqual(before);
  });
});

test.describe("Raccourcis et historique (FR-041, FR-042, FR-043, FR-044)", () => {
  test("Suppr et Retour arrière suppriment la sélection", async ({ page }) => {
    const { a, b } = await threeStickies(page);
    await a.click();
    await page.keyboard.press("Delete");
    await expect(stickies(page)).toHaveCount(2);
    await b.click();
    await page.keyboard.press("Backspace");
    await expect(stickies(page)).toHaveCount(1);
  });

  test("Ctrl+D duplique la sélection juste en dessous (écart de 20)", async ({ page }) => {
    const { a } = await threeStickies(page);
    const before = await centerOf(a);
    await a.click();
    await page.keyboard.press("Control+d");
    await expect(stickies(page)).toHaveCount(4);
    await expect(selected(page)).toHaveCount(1);
    const copy = await centerOf(selected(page).first());
    expect(copy.x).toBeCloseTo(before.x, 0);
    expect(copy.y - before.y).toBeCloseTo(180, 0); // 160 de hauteur + 20 d'écart, zoom 100 %
  });

  test("Ctrl+C puis Ctrl+V colle au pointeur", async ({ page }) => {
    const { a } = await threeStickies(page);
    await a.click();
    await page.keyboard.press("Control+c");
    await page.mouse.move(700, 560);
    await page.keyboard.press("Control+v");
    await expect(stickies(page)).toHaveCount(4);
    const pasted = await centerOf(selected(page).first());
    expect(Math.abs(pasted.x - 700)).toBeLessThan(100);
    expect(Math.abs(pasted.y - 560)).toBeLessThan(100);
  });

  test("Annuler / Rétablir : boutons, Ctrl+Z, Ctrl+Y et Ctrl+Maj+Z, une action = une étape", async ({ page }) => {
    await createBoardViaUi(page);
    await expect(undoButton(page)).toBeDisabled();
    await expect(redoButton(page)).toBeDisabled();

    const sticky = await placeSticky(page, "Acteur", { x: 500, y: 300 }, "Client");
    await expect(undoButton(page)).toBeEnabled();
    await sticky.click();
    await page.keyboard.press("Control+d"); // 2 post-its
    await expect(stickies(page)).toHaveCount(2);

    await undoButton(page).click();
    await expect(stickies(page)).toHaveCount(1);
    await expect(redoButton(page)).toBeEnabled();
    await redoButton(page).click();
    await expect(stickies(page)).toHaveCount(2);

    await page.keyboard.press("Control+z");
    await expect(stickies(page)).toHaveCount(1);
    await page.keyboard.press("Control+y");
    await expect(stickies(page)).toHaveCount(2);
    await page.keyboard.press("Control+z");
    await expect(stickies(page)).toHaveCount(1);
    await page.keyboard.press("Control+Shift+z");
    await expect(stickies(page)).toHaveCount(2);

    // Supprimer, puis annuler : le post-it revient.
    await stickies(page).first().click();
    await page.keyboard.press("Delete");
    await expect(stickies(page)).toHaveCount(1);
    await page.keyboard.press("Control+z");
    await expect(stickies(page)).toHaveCount(2);
  });

  test("pendant la saisie d'un texte, Suppr, Ctrl+D et Ctrl+Z ne déclenchent aucun raccourci du tableau", async ({ page }) => {
    await createBoardViaUi(page);
    const sticky = await placeSticky(page, "Acteur", { x: 500, y: 300 }, "Client");
    await sticky.dblclick();
    const editor = page.getByLabel("Texte du post-it");
    await expect(editor).toBeFocused();
    await page.keyboard.press("Delete");
    await page.keyboard.press("Control+d");
    await page.keyboard.press("Control+z");
    await expect(stickies(page)).toHaveCount(1);
    await expect(editor).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(stickies(page)).toHaveCount(1);
  });
});
