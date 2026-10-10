import type { LlmPort } from "../../ports/llm";

export type CheckRequest = { readonly required: false } | { readonly required: true; readonly difficultyClass: number };

const SYSTEM = [
  "Tu es l'arbitre des règles (D&D 5e SRD 5.1) d'un jeu de rôle.",
  'Réponds UNIQUEMENT en JSON : {"required": false} ou {"required": true, "difficultyClass": <entier 5-30>}.',
].join("\n");

/** Agent : décide si l'action du joueur nécessite un test et à quelle difficulté. */
export class RulesArbiterAgent {
  constructor(private readonly llm: LlmPort) {}

  async assess(action: string): Promise<CheckRequest> {
    const raw = await this.llm.complete([
      { role: "system", content: SYSTEM },
      { role: "user", content: action },
    ]);
    return parseCheckRequest(raw);
  }
}

/** Frontière anti-corruption : la sortie du LLM n'est jamais crue sans validation. */
export function parseCheckRequest(raw: string): CheckRequest {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && "required" in parsed) {
      if (parsed.required === false) return { required: false };
      if (
        parsed.required === true &&
        "difficultyClass" in parsed &&
        typeof parsed.difficultyClass === "number" &&
        Number.isInteger(parsed.difficultyClass) &&
        parsed.difficultyClass >= 5 &&
        parsed.difficultyClass <= 30
      ) {
        return { required: true, difficultyClass: parsed.difficultyClass };
      }
    }
  } catch {
    // sortie non JSON : traitée comme invalide ci-dessous
  }
  throw new Error("RulesArbiter returned an invalid response");
}
