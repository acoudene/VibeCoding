export interface LlmMessage {
  readonly role: "system" | "user";
  readonly content: string;
}

/** Port : accès à un LLM (Ollama, tier gratuit...). Voir ADR-0006. */
export interface LlmPort {
  complete(messages: readonly LlmMessage[]): Promise<string>;
}
