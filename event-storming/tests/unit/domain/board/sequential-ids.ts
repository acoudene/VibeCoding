import type { IdGenerator } from "../../../../src/domain/board/id-generator";

/** Générateur déterministe pour les tests : préfixe-1, préfixe-2… */
export function sequentialIds(prefix = "id"): IdGenerator {
  let n = 0;
  return { next: () => `${prefix}-${++n}` };
}
