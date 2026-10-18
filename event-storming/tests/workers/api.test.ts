import { SELF } from "cloudflare:test";
import { expect, it } from "vitest";
import * as Y from "yjs";

async function createBoard(): Promise<string> {
  const response = await SELF.fetch("https://example.com/api/boards", { method: "POST" });
  expect(response.status).toBe(201);
  const body: { id: string } = await response.json();
  expect(body.id).toMatch(/^[A-Za-z0-9_-]{22}$/);
  return body.id;
}

it("crée un tableau, fusionne une mise à jour et restitue l'état via le Durable Object", async () => {
  const id = await createBoard();
  const doc = new Y.Doc();
  doc.getMap("meta").set("name", "Commandes");
  const update = await SELF.fetch(`https://example.com/api/boards/${id}/updates`, {
    method: "POST",
    body: Y.encodeStateAsUpdate(doc).slice(),
  });
  expect(update.status).toBe(204);

  const state = await SELF.fetch(`https://example.com/api/boards/${id}`);
  expect(state.status).toBe(200);
  const restored = new Y.Doc();
  Y.applyUpdate(restored, new Uint8Array(await state.arrayBuffer()));
  expect(restored.getMap("meta").get("name")).toBe("Commandes");
});

it("répond 404 pour un tableau jamais créé", async () => {
  const response = await SELF.fetch(`https://example.com/api/boards/${"A".repeat(22)}`);
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: "BOARD_NOT_FOUND" });
});

it("répond 400 pour une mise à jour illisible", async () => {
  const id = await createBoard();
  const response = await SELF.fetch(`https://example.com/api/boards/${id}/updates`, {
    method: "POST",
    body: new Uint8Array([255, 255, 255, 255]),
  });
  expect(response.status).toBe(400);
});
