import { expect, test, type Page } from "@playwright/test";
import { centerOf, createBoardViaUi, drag, placeSticky, stickies } from "./helpers";

const percent = (page: Page) => page.getByLabel("Niveau de zoom");
const percentValue = async (page: Page) => Number.parseInt((await percent(page).textContent()) ?? "0", 10);

test.describe("Navigation (FR-050, FR-051, FR-052)", () => {
  test("la molette zoome en gardant fixe le point sous le pointeur", async ({ page }) => {
    await createBoardViaUi(page);
    const sticky = await placeSticky(page, "Acteur", { x: 500, y: 300 }, "Client");
    const before = await centerOf(sticky);
    await expect(percent(page)).toHaveText("100 %");

    await page.mouse.move(before.x, before.y);
    await page.mouse.wheel(0, -300);
    await expect.poll(() => percentValue(page)).toBeGreaterThan(100);
    const after = await centerOf(sticky);
    expect(Math.abs(after.x - before.x)).toBeLessThan(3);
    expect(Math.abs(after.y - before.y)).toBeLessThan(3);

    await page.mouse.wheel(0, 600);
    await expect.poll(() => percentValue(page)).toBeLessThan(100);
  });

  test("Espace + glisser déplace la vue sans bouger les post-its dans le tableau ni les sélectionner", async ({ page }) => {
    await createBoardViaUi(page);
    const sticky = await placeSticky(page, "Acteur", { x: 500, y: 300 }, "Client");
    await page.locator(".react-flow__pane").click({ position: { x: 900, y: 650 } }); // désélectionne
    await expect(page.locator(".react-flow__node-sticky.selected")).toHaveCount(0);
    const before = await centerOf(sticky);

    await page.mouse.move(800, 600);
    await page.keyboard.down("Space");
    await drag(page, { x: 800, y: 600 }, { x: 900, y: 650 });
    await page.keyboard.up("Space");

    const after = await centerOf(sticky);
    expect(after.x - before.x).toBeGreaterThan(60);
    expect(after.y - before.y).toBeGreaterThan(30);
    await expect(page.locator(".react-flow__node-sticky.selected")).toHaveCount(0);
    await expect(percent(page)).toHaveText("100 %");
  });

  test("boutons de zoom par paliers, pourcentage affiché et « Ajuster à l'écran »", async ({ page }) => {
    await createBoardViaUi(page);
    await placeSticky(page, "Acteur", { x: 300, y: 250 }, "A");
    await placeSticky(page, "Commande", { x: 1000, y: 600 }, "B");

    await page.getByRole("button", { name: "Zoom avant" }).click();
    await expect(percent(page)).toHaveText("120 %");
    await page.getByRole("button", { name: "Zoom arrière" }).click();
    await expect(percent(page)).toHaveText("100 %");
    await page.getByRole("button", { name: "Zoom arrière" }).click();
    await expect(percent(page)).toHaveText("83 %");

    await page.getByRole("button", { name: "Zoom avant" }).click();
    await page.getByRole("button", { name: "Zoom avant" }).click();
    await page.getByRole("button", { name: "Ajuster à l'écran" }).click();
    // Les deux post-its sont entièrement visibles dans le canevas.
    const canvas = await page.locator(".react-flow").boundingBox();
    await expect.poll(async () => {
      for (const sticky of await stickies(page).all()) {
        const box = await sticky.boundingBox();
        if (box === null || canvas === null) return false;
        if (box.x < canvas.x || box.y < canvas.y || box.x + box.width > canvas.x + canvas.width || box.y + box.height > canvas.y + canvas.height) return false;
      }
      return true;
    }).toBe(true);
  });

  test("la vue est mémorisée par tableau et restituée au rechargement", async ({ page }) => {
    const id = await createBoardViaUi(page);
    const sticky = await placeSticky(page, "Acteur", { x: 500, y: 300 }, "Client");
    await page.getByRole("button", { name: "Zoom avant" }).click();
    await expect(percent(page)).toHaveText("120 %");
    await page.mouse.move(800, 600);
    await page.keyboard.down("Space");
    await drag(page, { x: 800, y: 600 }, { x: 760, y: 560 });
    await page.keyboard.up("Space");
    const before = await centerOf(sticky);

    // Attend que la vue mémorisée (écrite après un délai d'inactivité) corresponde à la vue affichée.
    await expect
      .poll(async () => {
        const shown = await page.locator(".react-flow__viewport").evaluate((el) => (el as HTMLElement).style.transform);
        const saved = await page.evaluate((key) => window.localStorage.getItem(key), `es:viewport:${id}`);
        const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\) scale\(([-\d.]+)\)/.exec(shown);
        if (saved === null || match === null) return false;
        const view = JSON.parse(saved) as { x: number; y: number; zoom: number };
        return Math.abs(view.x - Number(match[1])) < 0.5 && Math.abs(view.y - Number(match[2])) < 0.5 && Math.abs(view.zoom - Number(match[3])) < 0.001;
      })
      .toBe(true);
    await page.reload();
    await expect(stickies(page)).toHaveCount(1);
    await expect(percent(page)).toHaveText("120 %");
    const after = await centerOf(stickies(page).first());
    expect(Math.abs(after.x - before.x)).toBeLessThan(2);
    expect(Math.abs(after.y - before.y)).toBeLessThan(2);
  });
});
