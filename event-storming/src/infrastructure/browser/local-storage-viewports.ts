import type { Viewport, ViewportStore } from "../../application/ports/viewport-store";
import type { BoardId } from "../../domain/board/board";

const keyOf = (id: BoardId) => `es:viewport:${id}`;

function defaultStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** Relit une vue stockée ; `undefined` si elle est invalide (stockage modifié à la main, ancienne version…). */
function parseViewport(raw: unknown): Viewport | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined;
  const { x, y, zoom } = raw as Record<string, unknown>;
  if (typeof x !== "number" || typeof y !== "number" || typeof zoom !== "number") return undefined;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(zoom) || zoom <= 0) return undefined;
  return { x, y, zoom };
}

/** Vue de chaque tableau dans le `localStorage` (clé `es:viewport:<id>`) ; stockage indisponible ⇒ aucune vue, sans erreur. */
export class LocalStorageViewports implements ViewportStore {
  constructor(private readonly storage: Storage | undefined = defaultStorage()) {}

  load(id: BoardId): Viewport | undefined {
    try {
      const raw = this.storage?.getItem(keyOf(id));
      if (raw === null || raw === undefined) return undefined;
      const parsed: unknown = JSON.parse(raw);
      return parseViewport(parsed);
    } catch {
      return undefined;
    }
  }

  save(id: BoardId, viewport: Viewport): void {
    try {
      this.storage?.setItem(keyOf(id), JSON.stringify({ x: viewport.x, y: viewport.y, zoom: viewport.zoom }));
    } catch {
      // Stockage indisponible ou plein : la vue mémorisée est un confort, pas une donnée critique.
    }
  }
}
