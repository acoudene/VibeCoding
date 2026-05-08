import { expect, test } from "@playwright/test";

test("home page loads with the Blind Test branding", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Blind Test/);
  await expect(page.getByRole("heading", { level: 1, name: "Blind Test" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Créer une salle/ })).toBeVisible();
});
