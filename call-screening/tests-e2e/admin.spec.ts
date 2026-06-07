import { test, expect } from "@playwright/test";

/** AC-7 — Parcours navigateur de la page d'administration. */

test.beforeEach(async ({ request }) => {
  await request.post("/api/test/reset");
});

test("AC-7 : la page /admin permet d'ajouter un préfixe et l'affiche", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /Administration/ })).toBeVisible();

  await page.getByTestId("prefix-value").fill("+33899");
  await page.getByTestId("prefix-label").fill("spam FR");
  await page.getByTestId("prefix-add").click();

  const row = page.getByTestId("prefix-row").filter({ hasText: "+33899" });
  await expect(row).toBeVisible();
});

test("AC-7 : un appel bloqué apparaît dans le journal affiché", async ({ page, request }) => {
  await request.post("/api/prefixes", { data: { value: "+33899" } });
  await request.post("/api/calls/incoming", { data: { from: "0899700000" } });

  await page.goto("/admin");
  const logRow = page.getByTestId("log-row").filter({ hasText: "0899700000" });
  await expect(logRow).toBeVisible();
  await expect(logRow).toContainText("BLOCK");
});
