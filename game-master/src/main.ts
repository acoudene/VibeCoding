/** Racine de composition : seul endroit autorisé à câbler l'infrastructure. */
import { NarratorAgent } from "./application/game-master/agents/narrator";
import { RulesArbiterAgent } from "./application/game-master/agents/rules-arbiter";
import { CreateCharacter } from "./application/create-character";
import { PlayTurn } from "./application/play-turn";
import { GameSession } from "./domain/session/game-session";
import { RandomDiceRoller } from "./infrastructure/dice/random-dice-roller";
import { OllamaLlm } from "./infrastructure/llm/ollama-llm";
import { InMemoryCharacterRepository } from "./infrastructure/persistence/in-memory-character-repository";
import { InMemorySessionRepository } from "./infrastructure/persistence/in-memory-session-repository";
import { createApp } from "./presentation/http/app";

export async function compose() {
  const llm = new OllamaLlm(process.env.OLLAMA_MODEL ?? "llama3.2");
  const sessions = new InMemorySessionRepository();
  const characters = new InMemoryCharacterRepository();
  await sessions.save(new GameSession("demo", ["p1"]));
  return createApp(
    new PlayTurn(sessions, characters, new RulesArbiterAgent(llm), new NarratorAgent(llm), new RandomDiceRoller()),
    new CreateCharacter(sessions, characters),
  );
}
