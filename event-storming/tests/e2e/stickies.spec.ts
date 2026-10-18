import { expect, test, type Locator } from "@playwright/test";
import { centerOf, createBoardViaUi, drag, links, pane, placeSticky, stickies, waitSaved } from "./helpers";

const AT = { x: 500, y: 300 };

/** Position du post-it dans le tableau (translation xyflow du nœud). */
async function flowPosition(sticky: Locator): Promise<{ x: number; y: number }> {
  return sticky.evaluate((el) => {
    const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec((el as HTMLElement).style.transform);
    return { x: Number(match?.[1]), y: Number(match?.[2]) };
  });
}

test.describe("Post-its (FR-012, FR-013, FR-015, FR-016, FR-017)", () => {
  test("la palette propose les 9 types et la légende les nomme en français", async ({ page }) => {
    await createBoardViaUi(page);
    const names = ["Événement", "Commande", "Acteur", "Agrégat", "Policy", "Read model", "Système externe", "Hotspot", "Règle"];
    for (const name of names) {
      await expect(page.getByRole("toolbar", { name: "Types de post-it" }).getByRole("button", { name, exact: true })).toBeVisible();
      await expect(page.getByRole("complementary", { name: "Légende" }).getByText(name, { exact: true })).toBeVisible();
    }
  });

  test("un clic avec un type actif pose un post-it centré sur le pointeur et passe en édition", async ({ page }) => {
    await createBoardViaUi(page);
    const palette = page.getByRole("button", { name: "Commande", exact: true });
    await palette.click();
    await expect(palette).toHaveAttribute("aria-pressed", "true");
    await page.mouse.click(AT.x, AT.y);

    await expect(page.getByLabel("Texte du post-it")).toBeFocused();
    const box = await stickies(page).first().boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width / 2).toBeCloseTo(AT.x, 0);
    expect(box!.y + box!.height / 2).toBeCloseTo(AT.y, 0);
    expect(box!.width).toBeCloseTo(160, 0);
    expect(box!.height).toBeCloseTo(160, 0);
    // Après une pose, l'outil se désactive.
    await expect(palette).toHaveAttribute("aria-pressed", "false");
  });

  test("sans type actif, un clic sur le fond ne pose rien", async ({ page }) => {
    await createBoardViaUi(page);
    await page.mouse.click(AT.x, AT.y);
    await expect(stickies(page)).toHaveCount(0);
  });

  test("le texte est saisi en place, validé par Échap, ré-éditable au double-clic ; la police s'adapte", async ({ page }) => {
    await createBoardViaUi(page);
    const sticky = await placeSticky(page, "Événement", AT, "Commande passée");
    await expect(page.getByLabel("Texte du post-it")).toHaveCount(0);

    const textOf = () => stickies(page).first().locator(".sticky-node__text");
    const shortSize = await textOf().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

    await sticky.dblclick();
    const editor = page.getByLabel("Texte du post-it");
    await expect(editor).toBeFocused();
    await editor.fill("Une commande de livres a été passée par un client depuis le site marchand, avec paiement différé");
    // un clic ailleurs (blur) enregistre aussi
    await pane(page).click({ position: { x: 900, y: 600 } });
    await expect(stickies(page)).toHaveCount(1);
    await expect(sticky).toHaveCount(0); // le filtre sur l'ancien texte ne trouve plus rien
    await expect(stickies(page).first()).toContainText("Une commande de livres");
    const longSize = await textOf().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(longSize).toBeLessThan(shortSize);
  });

  test("glisser un post-it le déplace ; la position est conservée au rechargement", async ({ page }) => {
    await createBoardViaUi(page);
    const sticky = await placeSticky(page, "Acteur", AT, "Client");
    const before = await centerOf(sticky);
    const flowBefore = await flowPosition(sticky);
    await drag(page, before, { x: before.x + 150, y: before.y + 90 });
    const after = await centerOf(sticky);
    // xyflow ignore le premier pas du pointeur (seuil de glissement) : tolérance de quelques pixels.
    expect(Math.abs(after.x - before.x - 150)).toBeLessThan(25);
    expect(Math.abs(after.y - before.y - 90)).toBeLessThan(25);
    const flowAfter = await flowPosition(sticky);
    expect(flowAfter.x).toBeGreaterThan(flowBefore.x + 100);

    await waitSaved(page);
    await page.reload();
    await expect(stickies(page)).toHaveCount(1);
    // La vue peut être réajustée à l'ouverture : on compare la position dans le tableau, pas à l'écran.
    expect(await flowPosition(stickies(page).first())).toEqual(flowAfter);
  });
});

test.describe("Liens (FR-020, FR-021, FR-022, FR-023)", () => {
  test("4 points de connexion au survol ; glisser d'un point vers un post-it crée un lien conforme qui suit les déplacements", async ({ page }) => {
    await createBoardViaUi(page);
    const actor = await placeSticky(page, "Acteur", { x: 400, y: 300 }, "Client");
    const command = await placeSticky(page, "Commande", { x: 800, y: 300 }, "Passer commande");

    await actor.hover();
    const handles = actor.locator(".sticky-node__handle");
    await expect(handles).toHaveCount(4);
    for (const side of ["top", "right", "bottom", "left"]) {
      await expect(actor.locator(`.sticky-node__handle[data-handleid="${side}"]`)).toBeVisible();
    }

    const from = await centerOf(actor.locator('.sticky-node__handle[data-handleid="right"]'));
    await drag(page, from, await centerOf(command));
    await expect(links(page)).toHaveCount(1);
    await expect(page.locator(".link-edge--out-of-grammar")).toHaveCount(0);
    await expect(links(page).first()).toHaveAttribute("aria-label", "Lien Acteur → Commande");

    // le lien suit le déplacement du post-it
    const pathBefore = await links(page).first().locator("path").first().getAttribute("d");
    const c = await centerOf(command);
    await drag(page, c, { x: c.x, y: c.y + 120 });
    await expect.poll(() => links(page).first().locator("path").first().getAttribute("d")).not.toBe(pathBefore);
  });

  test("un lien hors grammaire est en pointillés rouges avec une info-bulle « attendu : … »", async ({ page }) => {
    await createBoardViaUi(page);
    const event = await placeSticky(page, "Événement", { x: 400, y: 300 }, "Commande passée");
    const hotspot = await placeSticky(page, "Hotspot", { x: 800, y: 300 }, "Doute");

    await event.hover();
    const from = await centerOf(event.locator('.sticky-node__handle[data-handleid="right"]'));
    await drag(page, from, await centerOf(hotspot));

    const edge = page.locator(".link-edge--out-of-grammar");
    await expect(edge).toHaveCount(1);
    await expect(edge.locator("title")).toHaveText(/^Lien hors grammaire — attendu : DomainEvent → Policy, DomainEvent → ReadModel$/);
    const dash = await edge.locator("path").first().evaluate((el) => getComputedStyle(el).strokeDasharray);
    expect(dash).not.toBe("none");
    const stroke = await edge.locator("path").first().evaluate((el) => getComputedStyle(el).stroke);
    expect(stroke).toMatch(/rgb\(224, 49, 49\)|#e03131/i);
  });
});
