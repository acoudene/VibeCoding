import { defineConfig } from "@playwright/test";

const PORT = 8787;

/**
 * E2E : `wrangler dev` sert l'API (Worker + Durable Object simulé par Miniflare) et le site construit (`dist/web`,
 * repli SPA). Localement, Microsoft Edge installé (pas de téléchargement de navigateur) ; en CI, Chromium de Playwright.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  workers: process.env["CI"] ? 2 : 4,
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
    ...(process.env["CI"] ? {} : { channel: "msedge" }),
  },
  webServer: {
    command: `npm run build && npx wrangler dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env["CI"],
    timeout: 180_000,
  },
});
