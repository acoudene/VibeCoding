import { createApi } from "./presentation/api/app";
import type { ApplyUpdateOutcome, BoardStorage } from "./presentation/api/board-storage";
import { BoardDurableObject } from "./infrastructure/cloudflare/board-durable-object";
import { CryptoIdGenerator } from "./infrastructure/system/crypto-id-generator";

/** Racine de composition du Worker (ADR-0017) : API Hono + Durable Object par tableau. */
export { BoardDurableObject };

interface Env {
  BOARD: DurableObjectNamespace<BoardDurableObject>;
}

/** Adapte le namespace du Durable Object au port de stockage de l'API (un objet par identifiant de tableau). */
class DurableObjectBoardStorage implements BoardStorage {
  constructor(private readonly namespace: DurableObjectNamespace<BoardDurableObject>) {}

  private stub(id: string) {
    return this.namespace.get(this.namespace.idFromName(id));
  }

  create(id: string): Promise<void> {
    return this.stub(id).create();
  }

  getState(id: string): Promise<Uint8Array | undefined> {
    return this.stub(id).getState();
  }

  applyUpdate(id: string, update: Uint8Array): Promise<ApplyUpdateOutcome> {
    return this.stub(id).applyUpdate(update);
  }
}

const ids = new CryptoIdGenerator();

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    const api = createApi({ storage: new DurableObjectBoardStorage(env.BOARD), generateId: () => ids.next() });
    return api.fetch(request);
  },
};
