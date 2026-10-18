import { expect, test, type Locator, type Page } from "@playwright/test";
import { centerOf, createBoardViaUi, drag, frames, placeSticky, stickies, waitSaved } from "./helpers";

/** Taille du cadre dans le tableau (style en ligne du nœud xyflow). */
async function flowSize(frame: Locator): Promise<{ width: number; height: number }> {
  return frame.evaluate((el) => ({ width: parseFloat((el as HTMLElement).style.width), height: parseFloat((el as HTMLElement).style.height) }));
}

async function drawFrame(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.keyboard.press("f");
  await expect(page.getByRole("button", { name: "Cadre (F)" })).toHaveAttribute("aria-pressed", "true");
  await drag(page, from, to);
}

test.describe("Cadres (FR-030, FR-031, FR-032)", () => {
  test("F puis glisser dessine un cadre « Contexte 1 » dont le nom passe en édition", async ({ page }) => {
    await createBoardViaUi(page);
    await drawFrame(page, { x: 350, y: 200 }, { x: 750, y: 500 });
    await expect(frames(page)).toHaveCount(1);

    const nameEditor = page.getByLabel("Nom du cadre");
    await expect(nameEditor).toBeFocused();
    await expect(nameEditor).toHaveValue("Contexte 1");
    await nameEditor.fill("Commandes");
    await nameEditor.press("Enter");
    await expect(frames(page).first()).toContainText("Commandes");

    // Le suivant s'appelle « Contexte 2 » (nombre de cadres + 1).
    await drawFrame(page, { x: 800, y: 200 }, { x: 1100, y: 450 });
    await expect(page.getByLabel("Nom du cadre")).toHaveValue("Contexte 2");
    await page.keyboard.press("Escape");
    await waitSaved(page);
  });

  test("déplacer le titre du cadre déplace les post-its qu'il contient, pas les autres", async ({ page }) => {
    await createBoardViaUi(page);
    await drawFrame(page, { x: 330, y: 150 }, { x: 800, y: 560 });
    await page.getByLabel("Nom du cadre").press("Enter");
    const inside = await placeSticky(page, "Commande", { x: 500, y: 380 }, "Dedans");
    const outside = await placeSticky(page, "Acteur", { x: 1000, y: 380 }, "Dehors");

    const insideBefore = await centerOf(inside);
    const outsideBefore = await centerOf(outside);
    const title = frames(page).first().locator(".frame-node__title");
    const titleBefore = await centerOf(title);
    await drag(page, titleBefore, { x: titleBefore.x + 60, y: titleBefore.y + 80 });

    const insideAfter = await centerOf(inside);
    const outsideAfter = await centerOf(outside);
    expect(insideAfter.x - insideBefore.x).toBeGreaterThan(30);
    expect(insideAfter.y - insideBefore.y).toBeGreaterThan(50);
    expect(outsideAfter).toEqual(outsideBefore);
  });

  test("un cadre sélectionné se redimensionne par ses poignées", async ({ page }) => {
    await createBoardViaUi(page);
    await drawFrame(page, { x: 350, y: 200 }, { x: 750, y: 500 });
    await page.getByLabel("Nom du cadre").press("Enter");
    await frames(page).first().locator(".frame-node__title").click();
    await expect(page.getByRole("region", { name: "Cadre sélectionné" })).toBeVisible();

    const frame = frames(page).first();
    const before = await frame.boundingBox();
    const sizeBefore = await flowSize(frame);
    const handle = frame.locator(".react-flow__resize-control.handle.bottom.right");
    await expect(handle).toBeVisible();
    const from = await centerOf(handle);
    await drag(page, from, { x: from.x + 120, y: from.y + 80 });
    await expect.poll(async () => (await frame.boundingBox())?.width ?? 0).toBeGreaterThan((before?.width ?? 0) + 80);
    await expect.poll(async () => (await frame.boundingBox())?.height ?? 0).toBeGreaterThan((before?.height ?? 0) + 40);

    await waitSaved(page);
    // Taille dans le tableau (indépendante du zoom) : agrandie d'environ 120 x 80 (le premier pas du pointeur est ignoré).
    const resized = await flowSize(frame);
    expect(resized.width).toBeGreaterThan(sizeBefore.width + 80);
    expect(resized.width).toBeLessThan(sizeBefore.width + 160);
    expect(resized.height).toBeGreaterThan(sizeBefore.height + 40);
    expect(resized.height).toBeLessThan(sizeBefore.height + 120);

    await page.reload();
    await expect(frames(page)).toHaveCount(1);
    expect(await flowSize(frames(page).first())).toEqual(resized);
  });

  test("le fond du cadre laisse passer les clics : un post-it se pose dedans sans déplacer le cadre", async ({ page }) => {
    await createBoardViaUi(page);
    await drawFrame(page, { x: 330, y: 150 }, { x: 800, y: 560 });
    await page.getByLabel("Nom du cadre").press("Enter");
    const frameBefore = await frames(page).first().boundingBox();
    await placeSticky(page, "Règle", { x: 560, y: 380 }, "Posé dans le cadre");
    expect(await frames(page).first().boundingBox()).toEqual(frameBefore);
    await expect(stickies(page)).toHaveCount(1);
  });
});
