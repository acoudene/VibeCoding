import { Given, Then, When, setWorldConstructor } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { NarratorAgent } from "../../../src/application/game-master/agents/narrator";
import { RulesArbiterAgent } from "../../../src/application/game-master/agents/rules-arbiter";
import type { LlmMessage, LlmPort } from "../../../src/application/ports/llm";
import { PlayTurn } from "../../../src/application/play-turn";
import { GameSession, type Turn } from "../../../src/domain/session/game-session";
import { InMemorySessionRepository } from "../../../src/infrastructure/persistence/in-memory-session-repository";

class World {
  repo = new InMemorySessionRepository();
  arbiterReply = '{"required": false}';
  die = 10;
  narratorInputs: string[] = [];
  turn?: Turn;

  /** LLM de test : répond selon le rôle (prompt système). */
  llm: LlmPort = {
    complete: async (messages: readonly LlmMessage[]) => {
      if (messages[0]?.content.includes("arbitre")) return this.arbiterReply;
      this.narratorInputs.push(messages[1]?.content ?? "");
      return "Rien d'inquiétant.";
    },
  };
}

setWorldConstructor(World);

Given("une partie {string} avec le joueur {string}", async function (this: World, id: string, player: string) {
  await this.repo.save(new GameSession(id, [player]));
});

Given("l'arbitre décide qu'aucun test n'est requis", function (this: World) {
  this.arbiterReply = '{"required": false}';
});

Given("l'arbitre exige un test de difficulté {int}", function (this: World, dc: number) {
  this.arbiterReply = JSON.stringify({ required: true, difficultyClass: dc });
});

Given("le dé donne {int}", function (this: World, n: number) {
  this.die = n;
});

When("{string} joue l'action {string}", async function (this: World, player: string, action: string) {
  const uc = new PlayTurn(
    this.repo,
    new RulesArbiterAgent(this.llm),
    new NarratorAgent(this.llm),
    { roll: () => this.die },
  );
  this.turn = await uc.execute({ sessionId: "s1", playerId: player, action });
});

Then("le tour {int} est enregistré avec la narration {string}", function (this: World, n: number, text: string) {
  assert.equal(this.turn?.number, n);
  assert.equal(this.turn?.narration, text);
});

Then("le narrateur reçoit le résultat {string}", function (this: World, word: string) {
  assert.match(this.narratorInputs.at(-1) ?? "", new RegExp(word));
});
