import type { RecentBoard, RecentBoards } from "../../application/ports/recent-boards";
import { boardId, type BoardId } from "../../domain/board/board";
import { boardName } from "../../domain/board/board-name";

const STORAGE_KEY = "es:recent-boards";

function defaultStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** Relit une entrée stockée ; `undefined` si elle est invalide (stockage modifié à la main, ancienne version…). */
function parseEntry(raw: unknown): RecentBoard | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const { id, name, openedAt } = raw as Record<string, unknown>;
  if (typeof id !== "string" || typeof name !== "string" || typeof openedAt !== "string") return undefined;
  const date = new Date(openedAt);
  if (Number.isNaN(date.getTime())) return undefined;
  try {
    return { id: boardId(id), name: boardName(name), openedAt: date };
  } catch {
    return undefined;
  }
}

/** Tableaux récents dans le `localStorage` (clé `es:recent-boards`) ; stockage indisponible ⇒ liste vide, sans erreur. */
export class LocalStorageRecentBoards implements RecentBoards {
  constructor(private readonly storage: Storage | undefined = defaultStorage()) {}

  list(): readonly RecentBoard[] {
    return this.read().sort((a, b) => b.openedAt.getTime() - a.openedAt.getTime());
  }

  touch(entry: RecentBoard): void {
    this.write([...this.read().filter((e) => e.id !== entry.id), entry]);
  }

  forget(id: BoardId): void {
    this.write(this.read().filter((e) => e.id !== id));
  }

  private read(): RecentBoard[] {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (raw === null || raw === undefined) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.flatMap((item) => parseEntry(item) ?? []);
    } catch {
      return [];
    }
  }

  private write(entries: readonly RecentBoard[]): void {
    try {
      const serialisable = entries.map((e) => ({ id: e.id, name: e.name, openedAt: e.openedAt.toISOString() }));
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(serialisable));
    } catch {
      // Stockage indisponible ou plein : la liste locale est un confort, pas une donnée critique.
    }
  }
}
