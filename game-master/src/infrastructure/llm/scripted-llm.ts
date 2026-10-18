import type { LlmMessage, LlmPort } from "../../application/ports/llm";

/** LLM déterministe pour tests et démo hors-ligne : renvoie les réponses dans l'ordre. */
export class ScriptedLlm implements LlmPort {
  private i = 0;

  constructor(private readonly responses: readonly string[]) {}

  async complete(_messages: readonly LlmMessage[]): Promise<string> {
    const r = this.responses[this.i++];
    if (r === undefined) throw new Error("ScriptedLlm: no more scripted responses");
    return r;
  }
}
