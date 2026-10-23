import type { IdGenerator } from "../../domain/board/id-generator";

/** Générateur de test : les identifiants annoncés d'abord, puis `id-1`, `id-2`… */
export class ScriptedIdGenerator implements IdGenerator {
  private readonly queued: string[] = [];
  private count = 0;

  enqueue(id: string): void {
    this.queued.push(id);
  }

  next(): string {
    return this.queued.shift() ?? `id-${++this.count}`;
  }
}
