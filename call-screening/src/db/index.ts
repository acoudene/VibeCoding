import { MemoryRepo } from "./memoryRepo";
import { PgRepo } from "./pgRepo";
import type { Repo } from "./repo";

let instance: Repo | null = null;

/**
 * Retourne le `Repo` actif (singleton). Utilise Postgres si `DATABASE_URL` est défini,
 * sinon une implémentation en mémoire — ce qui permet de lancer et tester l'application
 * de bout en bout sans base configurée.
 */
export function getRepo(): Repo {
  if (instance) return instance;
  const url = process.env.DATABASE_URL;
  instance = url && url.trim() ? new PgRepo(url) : new MemoryRepo();
  return instance;
}

/** Remplace le repo (tests). */
export function setRepo(repo: Repo): void {
  instance = repo;
}

export type { Repo } from "./repo";
export { DuplicatePrefixError } from "./repo";
