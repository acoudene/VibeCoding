import { expect, test } from "@playwright/test";
import { boardIdOf, createBoardViaUi, drag, frames, links, centerOf, openBoard, placeSticky, stickies, waitSaved } from "./helpers";

test.describe("Persistance et indicateur d'enregistrement (FR-003, FR-004)", () => {
  test("rouvrir le navigateur (nouveau contexte) restitue le tableau : nom, post-its, lien, cadre", async ({ page, browser }) => {
    await createBoardViaUi(page);
    const name = page.getByLabel("Nom du tableau");
    await name.fill("Atelier livraison");
    await name.press("Enter");

    const actor = await placeSticky(page, "Acteur", { x: 400, y: 300 }, "Client");
    const command = await placeSticky(page, "Commande", { x: 750, y: 300 }, "Passer commande");
    await actor.hover();
    await drag(page, await centerOf(actor.locator('.sticky-node__handle[data-handleid="right"]')), await centerOf(command));
    await expect(links(page)).toHaveCount(1);
    await page.keyboard.press("f");
    await drag(page, { x: 330, y: 150 }, { x: 1000, y: 520 });
    await page.getByLabel("Nom du cadre").fill("Commandes");
    await page.getByLabel("Nom du cadre").press("Enter");
    await waitSaved(page);
    const id = boardIdOf(page);

    // Nouveau contexte = autre navigateur, sans localStorage ni cookies : seul le serveur a l'état.
    const context = await browser.newContext();
    try {
      const other = await context.newPage();
      await openBoard(other, id);
      await expect(other.getByLabel("Nom du tableau")).toHaveValue("Atelier livraison");
      await expect(stickies(other)).toHaveCount(2);
      await expect(stickies(other).filter({ hasText: "Client" })).toHaveCount(1);
      await expect(stickies(other).filter({ hasText: "Passer commande" })).toHaveCount(1);
      await expect(links(other)).toHaveCount(1);
      await expect(frames(other)).toHaveCount(1);
      await expect(frames(other).first()).toContainText("Commandes");
      // Le tableau rouvert est ajouté aux récents de ce navigateur.
      await other.getByRole("link", { name: "Accueil" }).click();
      await expect(other.getByRole("list", { name: "Tableaux récents" }).getByRole("link", { name: "Atelier livraison" })).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("l'indicateur passe par « Enregistrement… » puis « Enregistré »", async ({ page }) => {
    await createBoardViaUi(page);
    await waitSaved(page);
    // Ralentit l'envoi pour observer l'état intermédiaire.
    await page.route("**/api/boards/*/updates", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    await placeSticky(page, "Événement", { x: 500, y: 300 }, "Commande passée");
    await expect(page.locator(".save-indicator")).toHaveText("Enregistrement…");
    await waitSaved(page);
  });

  test("serveur injoignable : « Hors ligne », puis nouvel essai et « Enregistré » au retour du réseau", async ({ page, browser }) => {
    await createBoardViaUi(page);
    const id = boardIdOf(page);
    await waitSaved(page);

    await page.route("**/api/boards/*/updates", (route) => route.abort("connectionfailed"));
    await placeSticky(page, "Événement", { x: 500, y: 300 }, "Hors connexion");
    await expect(page.locator(".save-indicator")).toHaveText("Hors ligne", { timeout: 15_000 });
    // Le travail reste affiché malgré l'échec.
    await expect(stickies(page)).toHaveCount(1);

    await page.unroute("**/api/boards/*/updates");
    await expect(page.locator(".save-indicator")).toHaveText("Enregistré", { timeout: 30_000 });

    const context = await browser.newContext();
    try {
      const other = await context.newPage();
      await openBoard(other, id);
      await expect(stickies(other).filter({ hasText: "Hors connexion" })).toHaveCount(1);
    } finally {
      await context.close();
    }
  });

  test("un refus définitif du serveur (400) affiche « Erreur d'enregistrement »", async ({ page }) => {
    await createBoardViaUi(page);
    await waitSaved(page);
    await page.route("**/api/boards/*/updates", (route) => route.fulfill({ status: 400, body: "refusé" }));
    await placeSticky(page, "Événement", { x: 500, y: 300 }, "Échec");
    await expect(page.locator(".save-indicator")).toHaveText("Erreur d'enregistrement", { timeout: 15_000 });
    await page.unroute("**/api/boards/*/updates");
  });

  test("une panne transitoire du serveur (500) affiche « Hors ligne », pas une erreur définitive", async ({ page }) => {
    await createBoardViaUi(page);
    await waitSaved(page);
    await page.route("**/api/boards/*/updates", (route) => route.fulfill({ status: 500, body: "boom" }));
    await placeSticky(page, "Événement", { x: 500, y: 300 }, "Panne");
    await expect(page.locator(".save-indicator")).toHaveText("Hors ligne", { timeout: 15_000 });
    await page.unroute("**/api/boards/*/updates");
  });
});
