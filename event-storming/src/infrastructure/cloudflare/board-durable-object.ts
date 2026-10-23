import { DurableObject } from "cloudflare:workers";
import * as Y from "yjs";

/** Taille maximale d'une mise à jour Yjs acceptée : 1 Mio. */
export const MAX_UPDATE_BYTES = 1_048_576;

/** Taille maximale de l'état complet d'un tableau : 1,5 Mio (sous la limite de 2 Mio par valeur du stockage). */
export const MAX_STATE_BYTES = 1.5 * 1024 * 1024;

const STATE_KEY = "state";

/** Résultat de `applyUpdate` ; l'API HTTP (U11) le traduit : OK → 204, NOT_FOUND → 404, TOO_LARGE → 413, UNREADABLE → 400, STORAGE_FAILED → 503. */
export type ApplyUpdateResult = "OK" | "NOT_FOUND" | "TOO_LARGE" | "UNREADABLE" | "STORAGE_FAILED";

/**
 * Durable Object d'un tableau : conserve son état Yjs binaire.
 * Contrat (appel RPC depuis le Worker, ex. `env.BOARD.get(env.BOARD.idFromName(boardId))`) :
 * - `create()` : initialise un document vide ; sans effet si le tableau existe déjà.
 * - `getState()` : état Yjs complet, ou `undefined` si le tableau n'a jamais été créé (404).
 * - `applyUpdate(update)` : fusionne une mise à jour Yjs dans l'état (voir `ApplyUpdateResult`) ; refuse (TOO_LARGE)
 *   une mise à jour de plus de `MAX_UPDATE_BYTES` ou un état résultant de plus de `MAX_STATE_BYTES`, sans écrire.
 */
export class BoardDurableObject extends DurableObject {
  async create(): Promise<void> {
    if ((await this.ctx.storage.get<Uint8Array>(STATE_KEY)) !== undefined) return;
    await this.ctx.storage.put(STATE_KEY, Y.encodeStateAsUpdate(new Y.Doc()));
  }

  async getState(): Promise<Uint8Array | undefined> {
    return this.ctx.storage.get<Uint8Array>(STATE_KEY);
  }

  async applyUpdate(update: Uint8Array): Promise<ApplyUpdateResult> {
    const state = await this.ctx.storage.get<Uint8Array>(STATE_KEY);
    if (state === undefined) return "NOT_FOUND";
    if (update.byteLength > MAX_UPDATE_BYTES) return "TOO_LARGE";
    const doc = new Y.Doc();
    try {
      Y.applyUpdate(doc, state);
      Y.applyUpdate(doc, update);
    } catch {
      // Mise à jour ou état Yjs illisible : refus (400), jamais d'écriture.
      return "UNREADABLE";
    }
    const next = Y.encodeStateAsUpdate(doc);
    if (next.byteLength > MAX_STATE_BYTES) return "TOO_LARGE";
    try {
      await this.ctx.storage.put(STATE_KEY, next);
    } catch {
      return "STORAGE_FAILED";
    }
    return "OK";
  }
}
