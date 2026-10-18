import type { LlmPort } from "../../ports/llm";

const SYSTEM =
  "Tu es le narrateur d'un jeu de rôle. Narre en 2-3 phrases, en français, sans modifier le résultat des règles fourni.";

/** Agent : produit la narration à partir de l'action et du résultat des règles (déjà décidé). */
export class NarratorAgent {
  constructor(private readonly llm: LlmPort) {}

  narrate(action: string, outcome: string): Promise<string> {
    return this.llm.complete([
      { role: "system", content: SYSTEM },
      { role: "user", content: `Action : ${action}\nRésultat des règles : ${outcome}` },
    ]);
  }
}
