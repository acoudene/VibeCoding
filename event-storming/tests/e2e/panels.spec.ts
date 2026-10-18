import { expect, test } from "@playwright/test";
import { centerOf, createBoardViaUi, drag, frames, links, placeSticky, stickies, waitSaved } from "./helpers";

test.describe("Panneaux contextuels (FR-014, FR-024, FR-032)", () => {
  test("panneau d'un post-it : type, identifiant EN, notes, suppression", async ({ page }) => {
    await createBoardViaUi(page);
    const sticky = await placeSticky(page, "Événement", { x: 500, y: 300 }, "Commande passée");
    await sticky.click();
    const panel = page.getByRole("region", { name: "Post-it sélectionné" });
    await expect(panel).toBeVisible();

    await panel.getByLabel("Type").selectOption({ label: "Commande" });
    await expect(stickies(page).first().locator(".sticky-node")).toHaveAttribute("data-kind", "Command");

    const identifier = panel.getByLabel("Identifiant (anglais)");
    await identifier.fill("PlaceOrder");
    await identifier.press("Enter");
    await panel.getByLabel("Notes").fill("Déclenchée par le client");
    await panel.getByLabel("Identifiant (anglais)").focus(); // quitte les notes : enregistre
    await waitSaved(page);

    await page.reload();
    await stickies(page).first().click();
    await expect(page.getByLabel("Identifiant (anglais)")).toHaveValue("PlaceOrder");
    await expect(page.getByLabel("Notes")).toHaveValue("Déclenchée par le client");
    await expect(stickies(page).first().locator(".sticky-node")).toHaveAttribute("data-kind", "Command");

    await page.getByRole("button", { name: "Supprimer le post-it" }).click();
    await expect(stickies(page)).toHaveCount(0);
  });

  test("panneau d'un lien : inverser le sens, supprimer ; rappel de la règle si hors grammaire", async ({ page }) => {
    await createBoardViaUi(page);
    const actor = await placeSticky(page, "Acteur", { x: 400, y: 300 }, "Client");
    const command = await placeSticky(page, "Commande", { x: 800, y: 300 }, "Commander");
    await actor.hover();
    await drag(page, await centerOf(actor.locator('.sticky-node__handle[data-handleid="right"]')), await centerOf(command));
    await expect(links(page)).toHaveCount(1);

    const middle = await centerOf(links(page).first().locator(".react-flow__edge-interaction"));
    await page.mouse.click(middle.x, middle.y);
    const panel = page.getByRole("region", { name: "Lien sélectionné" });
    await expect(panel).toBeVisible();
    await expect(panel.locator(".selection-panel__warning")).toHaveCount(0);

    await panel.getByRole("button", { name: "Inverser le sens" }).click();
    // Commande → Acteur n'est pas dans la grammaire.
    await expect(page.locator(".link-edge--out-of-grammar")).toHaveCount(1);
    await expect(page.getByRole("region", { name: "Lien sélectionné" }).locator(".selection-panel__warning")).toContainText(
      "Lien hors grammaire — attendu : Command → Aggregate, Command → ExternalSystem",
    );

    await page.getByRole("button", { name: "Supprimer le lien" }).click();
    await expect(links(page)).toHaveCount(0);
  });

  test("panneau d'un cadre : renommer, supprimer (les post-its restent)", async ({ page }) => {
    await createBoardViaUi(page);
    await page.keyboard.press("f");
    await drag(page, { x: 330, y: 150 }, { x: 800, y: 560 });
    await page.getByLabel("Nom du cadre").press("Enter");
    await placeSticky(page, "Commande", { x: 500, y: 380 }, "Reste");

    await frames(page).first().locator(".frame-node__title").click();
    const panel = page.getByRole("region", { name: "Cadre sélectionné" });
    await panel.getByRole("button", { name: "Renommer le cadre" }).click();
    const editor = page.getByLabel("Nom du cadre");
    await editor.fill("Facturation");
    await editor.press("Enter");
    await expect(frames(page).first()).toContainText("Facturation");

    await page.getByRole("button", { name: "Supprimer le cadre" }).click();
    await expect(frames(page)).toHaveCount(0);
    await expect(stickies(page)).toHaveCount(1);
  });
});
