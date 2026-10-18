/** `Storage` en mémoire, pour tester les adaptateurs du `localStorage`. */
export class FakeStorage implements Storage {
  private readonly data = new Map<string, string>();
  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

function unavailable(): never {
  throw new Error("indisponible");
}

/** Stockage indisponible (mode privé, quota, accès refusé) : chaque accès lève. */
export const brokenStorage: Storage = {
  get length(): number {
    return unavailable();
  },
  clear: unavailable,
  getItem: unavailable,
  key: unavailable,
  removeItem: unavailable,
  setItem: unavailable,
};
