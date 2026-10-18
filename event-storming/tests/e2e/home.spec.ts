import { expect, test } from "@playwright/test";
import { boardIdOf, createBoardViaApi, createBoardViaUi, openBoard, waitSaved } from "./helpers";

test.describe("Accueil et tableaux récents (FR-001, FR-002, FR-005, FR-006)", () => {
  test("« Nouveau tableau » crée un tableau nommé « Tableau sans titre » et l'ajoute aux récents", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Aucun tableau ouvert dans ce navigateur.")).toBeVisible();

    await page.getByRole("button", { name: "Nouveau tableau" }).click();
    await page.waitForURL(/\/b\/[A-Za-z0-9_-]{22}$/);
    await expect(page.getByLabel("Nom du tableau")).toHaveValue("Tableau sans titre");
    const id = boardIdOf(page);

    await page.getByRole("link", { name: "Accueil" }).click();
    const recent = page.getByRole("list", { name: "Tableaux récents" });
    await expect(recent.getByRole("link", { name: "Tableau sans titre" })).toHaveAttribute("href", `/b/${id}`);
  });

  test("le nom du tableau est modifiable et se retrouve dans les récents", async ({ page }) => {
    await createBoardViaUi(page);
    const name = page.getByLabel("Nom du tableau");
    await name.fill("Commande en ligne");
    await name.press("Enter");
    await waitSaved(page);

    await page.getByRole("link", { name: "Accueil" }).click();
    await expect(page.getByRole("list", { name: "Tableaux récents" }).getByRole("link", { name: "Commande en ligne" })).toBeVisible();
  });

  test("un tableau récent se rouvre depuis l'accueil, et « Retirer » l'enlève de la liste sans le supprimer", async ({ page }) => {
    const id = await createBoardViaUi(page);
    await page.getByRole("link", { name: "Accueil" }).click();
    const recent = page.getByRole("list", { name: "Tableaux récents" });

    await recent.getByRole("link", { name: "Tableau sans titre" }).click();
    await expect(page).toHaveURL(new RegExp(`/b/${id}$`));
    await expect(page.getByLabel("Nom du tableau")).toBeVisible();

    await page.getByRole("link", { name: "Accueil" }).click();
    await page.getByRole("button", { name: "Retirer Tableau sans titre de la liste" }).click();
    await expect(page.getByText("Aucun tableau ouvert dans ce navigateur.")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Aucun tableau ouvert dans ce navigateur.")).toBeVisible();

    await openBoard(page, id); // le tableau lui-même existe toujours
  });

  test("un identifiant inconnu affiche « Tableau introuvable »", async ({ page }) => {
    await page.goto("/b/AAAAAAAAAAAAAAAAAAAAAA");
    await expect(page.getByRole("heading", { name: "Tableau introuvable" })).toBeVisible();
    await page.getByRole("link", { name: "Accueil" }).click();
    await expect(page.getByRole("button", { name: "Nouveau tableau" })).toBeVisible();
  });

  test("un tableau créé par l'API s'ouvre par son lien", async ({ page }) => {
    const id = await createBoardViaApi(page);
    await openBoard(page, id);
    await expect(page.getByLabel("Nom du tableau")).toHaveValue("Tableau sans titre");
  });
});
