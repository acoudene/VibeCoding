import { Hono } from "hono";
import { z } from "zod";
import type { BoardStorage } from "./board-storage";

/** Taille maximale du corps d'une mise à jour : 1 Mio. */
export const MAX_BODY_BYTES = 1_048_576;

/** Identifiant de tableau : 128 bits en base64url sans padding, soit 22 caractères. */
const boardIdSchema = z.string().regex(/^[A-Za-z0-9_-]{22}$/);

export interface ApiDependencies {
  readonly storage: BoardStorage;
  /** Génère un identifiant de tableau (128 bits, base64url) — côté serveur, jamais fourni par le client. */
  readonly generateId: () => string;
}

const notFound = () => Response.json({ error: "BOARD_NOT_FOUND" }, { status: 404 });
const tooLarge = () => Response.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });

/** Lit le corps en s'arrêtant dès que la limite est dépassée ; `undefined` si trop grand. */
async function readBounded(request: Request): Promise<Uint8Array | undefined> {
  if (request.body === null) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return undefined;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/** API HTTP des tableaux (`/api/boards`). Ne dépend que de ports : le Worker lui fournit le stockage. */
export function createApi({ storage, generateId }: ApiDependencies): Hono {
  const app = new Hono();

  app.post("/api/boards", async (c) => {
    const id = generateId();
    await storage.create(id);
    return c.json({ id }, 201);
  });

  app.get("/api/boards/:id", async (c) => {
    const id = boardIdSchema.safeParse(c.req.param("id"));
    if (!id.success) return notFound();
    const state = await storage.getState(id.data);
    if (state === undefined) return notFound();
    return c.body(state.slice(), 200, { "content-type": "application/octet-stream" });
  });

  app.post("/api/boards/:id/updates", async (c) => {
    const id = boardIdSchema.safeParse(c.req.param("id"));
    if (!id.success) return notFound();
    const declared = Number(c.req.header("content-length"));
    if (declared > MAX_BODY_BYTES) return tooLarge();
    const body = await readBounded(c.req.raw);
    if (body === undefined) return tooLarge();
    switch (await storage.applyUpdate(id.data, body)) {
      case "OK":
        return c.body(null, 204);
      case "NOT_FOUND":
        return notFound();
      case "TOO_LARGE":
        return tooLarge();
      case "UNREADABLE":
        return Response.json({ error: "UNREADABLE_UPDATE" }, { status: 400 });
    }
  });

  return app;
}
