import { SELF, env } from "cloudflare:test";
import { expect, it } from "vitest";

it("le Worker répond et expose le Durable Object BOARD", async () => {
  const response = await SELF.fetch("https://example.com/");
  expect(response.status).toBe(200);
  expect(env.BOARD).toBeDefined();
});
