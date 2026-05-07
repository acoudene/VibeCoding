import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["tests/unit/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/setup/jsdom.ts"],
        },
      },
      {
        test: {
          name: "node",
          environment: "node",
          include: ["tests/integration/**/*.test.ts", "tests/architecture/**/*.test.ts"],
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
