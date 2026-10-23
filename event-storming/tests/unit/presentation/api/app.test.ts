import { describe, expect, it } from "vitest";
import { createApi } from "../../../../src/presentation/api/app";
import type { ApplyUpdateOutcome, BoardStorage } from "../../../../src/presentation/api/board-storage";

const VALID_ID = "AAAAAAAAAAAAAAAAAAAAAA";
const MAX = 1_048_576;

class FakeStorage implements BoardStorage {
  readonly created: string[] = [];
  readonly states = new Map<string, Uint8Array>();
  readonly updates: Uint8Array[] = [];
  outcome: ApplyUpdateOutcome = "OK";
  calls = 0;

  async create(id: string): Promise<void> {
    this.calls++;
    this.created.push(id);
    if (!this.states.has(id)) this.states.set(id, new Uint8Array([0, 0]));
  }
  async getState(id: string): Promise<Uint8Array | undefined> {
    this.calls++;
    return this.states.get(id);
  }
  async applyUpdate(_id: string, update: Uint8Array): Promise<ApplyUpdateOutcome> {
    this.calls++;
    this.updates.push(update);
    return this.outcome;
  }
}

function setup() {
  const storage = new FakeStorage();
  const app = createApi({ storage, generateId: () => VALID_ID });
  return { storage, app };
}

describe("POST /api/boards", () => {
  it("crée le tableau avec un identifiant généré côté serveur", async () => {
    const { app, storage } = setup();
    const response = await app.request("/api/boards", { method: "POST" });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: VALID_ID });
    expect(storage.created).toEqual([VALID_ID]);
  });
});

describe("GET /api/boards/:id", () => {
  it("renvoie l'état Yjs en binaire", async () => {
    const { app, storage } = setup();
    storage.states.set(VALID_ID, new Uint8Array([1, 2, 3]));
    const response = await app.request(`/api/boards/${VALID_ID}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/octet-stream");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("répond 404 BOARD_NOT_FOUND pour un tableau inconnu", async () => {
    const { app } = setup();
    const response = await app.request(`/api/boards/${VALID_ID}`);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "BOARD_NOT_FOUND" });
  });

  it.each(["abc", "A".repeat(21), "A".repeat(23), "A".repeat(21) + "+", "A".repeat(21) + "="])(
    "répond 404 sans interroger le stockage pour l'identifiant invalide %s",
    async (id) => {
      const { app, storage } = setup();
      const response = await app.request(`/api/boards/${encodeURIComponent(id)}`);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "BOARD_NOT_FOUND" });
      expect(storage.calls).toBe(0);
    },
  );
});

describe("POST /api/boards/:id/updates", () => {
  const post = (app: ReturnType<typeof setup>["app"], body: BodyInit, headers: Record<string, string> = {}) =>
    app.request(`/api/boards/${VALID_ID}/updates`, {
      method: "POST",
      headers: { "content-type": "application/octet-stream", ...headers },
      body,
    });

  it("répond 204 et transmet la mise à jour", async () => {
    const { app, storage } = setup();
    const response = await post(app, new Uint8Array([4, 5]));
    expect(response.status).toBe(204);
    expect(storage.updates).toEqual([new Uint8Array([4, 5])]);
  });

  it.each([
    ["NOT_FOUND", 404],
    ["TOO_LARGE", 413],
    ["UNREADABLE", 400],
    ["STORAGE_FAILED", 503],
  ] as const)("traduit %s en %i", async (outcome, status) => {
    const { app, storage } = setup();
    storage.outcome = outcome;
    expect((await post(app, new Uint8Array([1]))).status).toBe(status);
  });

  it("répond 404 pour un identifiant invalide", async () => {
    const { app, storage } = setup();
    const response = await app.request("/api/boards/nope/updates", { method: "POST", body: new Uint8Array([1]) });
    expect(response.status).toBe(404);
    expect(storage.calls).toBe(0);
  });

  it("répond 413 sur Content-Length excessif sans appeler le stockage", async () => {
    const { app, storage } = setup();
    const response = await post(app, new Uint8Array([1]), { "content-length": String(MAX + 1) });
    expect(response.status).toBe(413);
    expect(storage.calls).toBe(0);
  });

  it("répond 413 sur un corps trop grand sans appeler le stockage", async () => {
    const { app, storage } = setup();
    const response = await post(app, new Uint8Array(MAX + 1));
    expect(response.status).toBe(413);
    expect(storage.calls).toBe(0);
  });

  it("accepte un corps d'exactement 1 Mio", async () => {
    const { app } = setup();
    expect((await post(app, new Uint8Array(MAX))).status).toBe(204);
  });
});
