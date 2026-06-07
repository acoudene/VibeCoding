import type { CallLog, Prefix } from "@/domain/types";

/**
 * Contrat de persistance (FR-4, FR-5). Indépendant de l'implémentation : une version
 * Postgres/Drizzle pour la production, une version en mémoire pour les tests et le
 * fonctionnement sans base configurée.
 */
export interface Repo {
  listPrefixes(): Promise<Prefix[]>;
  /** Ajoute un préfixe. Lève `DuplicatePrefixError` si la valeur existe déjà. */
  addPrefix(value: string, label?: string | null): Promise<Prefix>;
  /** Supprime un préfixe. Retourne `false` si l'id est inconnu. */
  removePrefix(id: string): Promise<boolean>;
  insertLog(log: Omit<CallLog, "id" | "createdAt">): Promise<CallLog>;
  listLogs(limit?: number): Promise<CallLog[]>;
}

export class DuplicatePrefixError extends Error {
  constructor(value: string) {
    super(`Le préfixe "${value}" existe déjà.`);
    this.name = "DuplicatePrefixError";
  }
}
