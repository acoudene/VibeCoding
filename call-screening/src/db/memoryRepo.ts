import type { CallLog, Prefix } from "@/domain/types";
import { DuplicatePrefixError, type Repo } from "./repo";

/**
 * Implémentation en mémoire du `Repo` (tests + fonctionnement sans `DATABASE_URL`).
 * Le contrat est strictement identique à l'implémentation Postgres.
 */
export class MemoryRepo implements Repo {
  private prefixes: Prefix[] = [];
  private logs: CallLog[] = [];
  private seq = 0;

  private nextId(p: string): string {
    this.seq += 1;
    return `${p}_${this.seq}`;
  }

  async listPrefixes(): Promise<Prefix[]> {
    return [...this.prefixes].sort((a, b) => a.value.localeCompare(b.value));
  }

  async addPrefix(value: string, label?: string | null): Promise<Prefix> {
    if (this.prefixes.some((p) => p.value === value)) {
      throw new DuplicatePrefixError(value);
    }
    const prefix: Prefix = {
      id: this.nextId("pfx"),
      value,
      label: label ?? null,
      createdAt: new Date(0),
    };
    this.prefixes.push(prefix);
    return prefix;
  }

  async removePrefix(id: string): Promise<boolean> {
    const before = this.prefixes.length;
    this.prefixes = this.prefixes.filter((p) => p.id !== id);
    return this.prefixes.length < before;
  }

  async insertLog(log: Omit<CallLog, "id" | "createdAt">): Promise<CallLog> {
    const full: CallLog = {
      ...log,
      id: this.nextId("log"),
      createdAt: new Date(0),
    };
    this.logs.push(full);
    return full;
  }

  async listLogs(limit = 100): Promise<CallLog[]> {
    return [...this.logs].reverse().slice(0, limit);
  }

  /** Réinitialise l'état (utile pour les tests). */
  reset(): void {
    this.prefixes = [];
    this.logs = [];
    this.seq = 0;
  }
}
