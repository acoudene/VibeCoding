import { expect, test } from "@playwright/test";

test("home page loads with default title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Create Next App/);
});
