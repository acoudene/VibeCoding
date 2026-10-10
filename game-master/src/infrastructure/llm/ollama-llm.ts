import type { LlmMessage, LlmPort } from "../../application/ports/llm";

/** Adaptateur Ollama (API /api/chat, non streamé). */
export class OllamaLlm implements LlmPort {
  constructor(
    private readonly model: string,
    private readonly baseUrl = "http://localhost:11434",
  ) {}

  async complete(messages: readonly LlmMessage[]): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: this.model, messages, stream: false }),
    });
    if (!res.ok) throw new Error(`Ollama error ${res.status}`);
    const body = (await res.json()) as { message?: { content?: string } };
    const content = body.message?.content;
    if (typeof content !== "string") throw new Error("Ollama returned no content");
    return content;
  }
}
