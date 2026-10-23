/** Résultat de la fusion d'une mise à jour dans l'état d'un tableau. */
export type ApplyUpdateOutcome = "OK" | "NOT_FOUND" | "TOO_LARGE" | "UNREADABLE" | "STORAGE_FAILED";

/** Stockage des tableaux appelé par l'API ; adapté au Durable Object par `src/main.worker.ts`. */
export interface BoardStorage {
  /** Crée un tableau vide ; sans effet s'il existe déjà. */
  create(id: string): Promise<void>;
  /** État Yjs complet, ou `undefined` si le tableau n'existe pas. */
  getState(id: string): Promise<Uint8Array | undefined>;
  applyUpdate(id: string, update: Uint8Array): Promise<ApplyUpdateOutcome>;
}
