import { ABILITIES, isAbility, type Ability } from "../../../domain/rules/ability";
import { InvalidArbiterResponseError } from "../../errors";
import type { LlmPort } from "../../ports/llm";

export type CheckRequest =
  | { readonly required: false }
  | { readonly required: true; readonly difficultyClass: number; readonly ability: Ability };

const SYSTEM = [
  "Tu es l'arbitre des règles (D&D 5e SRD 5.1) d'un jeu de rôle.",
  'Réponds UNIQUEMENT en JSON : {"required": false} ou {"required": true, "difficultyClass": <entier 5-30>, "ability": "<une valeur parmi ' +
    ABILITIES.join(", ") +
    '>"}.',
].join("\n");

/** Agent : décide si l'action du joueur nécessite un test, à quelle difficulté et sur quelle caractéristique. */
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
        parsed.difficultyClass <= 30 &&
        "ability" in parsed &&
        isAbility(parsed.ability)
      ) {
        return { required: true, difficultyClass: parsed.difficultyClass, ability: parsed.ability };
      }
    }
  } catch {
    // sortie non JSON : traitée comme invalide ci-dessous
  }
  throw new InvalidArbiterResponseError();
}
