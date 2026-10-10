import { Given, Then, When, setWorldConstructor } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { CreateCharacter } from "../../../src/application/create-character";
import {
  CharacterAlreadyExistsError,
  CharacterNameRequiredError,
  CharacterRequiredError,
  InvalidAbilityAssignmentError,
  InvalidArbiterResponseError,
  PlayerNotInSessionError,
} from "../../../src/application/errors";
import { NarratorAgent } from "../../../src/application/game-master/agents/narrator";
import { RulesArbiterAgent } from "../../../src/application/game-master/agents/rules-arbiter";
import type { LlmMessage, LlmPort } from "../../../src/application/ports/llm";
import { PlayTurn } from "../../../src/application/play-turn";
import type { Ability } from "../../../src/domain/rules/ability";
import { GameSession, type Turn } from "../../../src/domain/session/game-session";
import { InMemoryCharacterRepository } from "../../../src/infrastructure/persistence/in-memory-character-repository";
import { InMemorySessionRepository } from "../../../src/infrastructure/persistence/in-memory-session-repository";

/** Vocabulaire ubiquitaire (FR) -> identifiant du domaine (EN). Une valeur inconnue passe telle quelle. */
const ABILITY_BY_FR: Record<string, string> = { FOR: "STR", DEX: "DEX", CON: "CON", INT: "INT", SAG: "WIS", CHA: "CHA" };

const ERROR_LABELS: [new (...args: never[]) => Error, string][] = [
  [InvalidAbilityAssignmentError, "répartition invalide"],
  [CharacterNameRequiredError, "nom requis"],
  [CharacterAlreadyExistsError, "personnage déjà existant"],
  [PlayerNotInSessionError, "joueur absent de la partie"],
];

class World {
  sessions = new InMemorySessionRepository();
  characters = new InMemoryCharacterRepository();
  arbiterReply = '{"required": false}';
  die = 10;
  narratorInputs: string[] = [];
  turn?: Turn;
  error?: unknown;

  /** LLM de test : répond selon le rôle (prompt système). */
  llm: LlmPort = {
    complete: async (messages: readonly LlmMessage[]) => {
      if (messages[0]?.content.includes("arbitre")) return this.arbiterReply;
      this.narratorInputs.push(messages[1]?.content ?? "");
      return "Rien d'inquiétant.";
    },
  };

  createCharacter() {
    return new CreateCharacter(this.sessions, this.characters);
  }

  playTurn() {
    return new PlayTurn(
      this.sessions,
      this.characters,
      new RulesArbiterAgent(this.llm),
      new NarratorAgent(this.llm),
      { roll: () => this.die },
    );
  }

  async create(player: string, name: string, fr: number[]) {
    const [STR, DEX, CON, INT, WIS, CHA] = fr as [number, number, number, number, number, number];
    const abilities: Record<Ability, number> = { STR, DEX, CON, INT, WIS, CHA };
    await this.createCharacter().execute({ sessionId: "s1", playerId: player, name, abilities });
  }
}

setWorldConstructor(World);

Given("une partie {string} avec le joueur {string}", async function (this: World, id: string, player: string) {
  await this.sessions.save(new GameSession(id, [player]));
});

const SHEET = "avec FOR {int}, DEX {int}, CON {int}, INT {int}, SAG {int}, CHA {int}";

Given(`{string} a le personnage {string} ${SHEET}`, async function (this: World, player: string, name: string, f: number, d: number, c: number, i: number, w: number, h: number) {
  await this.create(player, name, [f, d, c, i, w, h]);
});

When(`{string} crée le personnage {string} ${SHEET}`, async function (this: World, player: string, name: string, f: number, d: number, c: number, i: number, w: number, h: number) {
  try {
    await this.create(player, name, [f, d, c, i, w, h]);
  } catch (e) {
    this.error = e;
  }
});

Then("le personnage {string} existe pour {string}", async function (this: World, name: string, player: string) {
  assert.equal(this.error, undefined);
  assert.equal((await this.characters.find("s1", player))?.name, name);
});

Then("la création est refusée pour {string}", function (this: World, reason: string) {
  const label = ERROR_LABELS.find(([type]) => this.error instanceof type)?.[1];
  assert.equal(label, reason, `erreur reçue : ${String(this.error)}`);
});

Given("l'arbitre décide qu'aucun test n'est requis", function (this: World) {
  this.arbiterReply = '{"required": false}';
});

Given("l'arbitre exige un test de {word} de difficulté {int}", function (this: World, ability: string, dc: number) {
  this.arbiterReply = JSON.stringify({
    required: true,
    difficultyClass: dc,
    ability: ABILITY_BY_FR[ability] ?? ability,
  });
});

Given("le dé donne {int}", function (this: World, n: number) {
  this.die = n;
});

When("{string} joue l'action {string}", async function (this: World, player: string, action: string) {
  try {
    this.turn = await this.playTurn().execute({ sessionId: "s1", playerId: player, action });
  } catch (e) {
    this.error = e;
  }
});

Then("le tour {int} est enregistré avec la narration {string}", function (this: World, n: number, text: string) {
  assert.equal(this.turn?.number, n);
  assert.equal(this.turn?.narration, text);
});

Then("le narrateur reçoit le résultat {string}", function (this: World, word: string) {
  assert.equal(this.error, undefined, String(this.error));
  assert.match(this.narratorInputs.at(-1) ?? "", new RegExp(word));
});

Then("le tour est refusé car la réponse de l'arbitre est invalide", function (this: World) {
  assert.ok(this.error instanceof InvalidArbiterResponseError);
});

Then("le tour est refusé car le joueur n'a pas de personnage", function (this: World) {
  assert.ok(this.error instanceof CharacterRequiredError);
});
