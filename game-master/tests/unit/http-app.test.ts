import { describe, expect, it } from "vitest";
import { CreateCharacter } from "../../src/application/create-character";
import { NarratorAgent } from "../../src/application/game-master/agents/narrator";
import { RulesArbiterAgent } from "../../src/application/game-master/agents/rules-arbiter";
import { PlayTurn } from "../../src/application/play-turn";
import { GameSession } from "../../src/domain/session/game-session";
import { ScriptedLlm } from "../../src/infrastructure/llm/scripted-llm";
import { InMemoryCharacterRepository } from "../../src/infrastructure/persistence/in-memory-character-repository";
import { InMemorySessionRepository } from "../../src/infrastructure/persistence/in-memory-session-repository";
import { createApp } from "../../src/presentation/http/app";

const abilities = { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 };

async function appWith(responses: string[]) {
  const sessions = new InMemorySessionRepository();
  const characters = new InMemoryCharacterRepository();
  await sessions.save(new GameSession("s1", ["p1"]));
  const llm = new ScriptedLlm(responses);
  return createApp(
    new PlayTurn(sessions, characters, new RulesArbiterAgent(llm), new NarratorAgent(llm), { roll: () => 15 }),
    new CreateCharacter(sessions, characters),
  );
}

type App = Awaited<ReturnType<typeof appWith>>;

const post = (app: App, path: string, body: unknown) =>
  app.request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const character = (app: App, id = "s1", body: unknown = { playerId: "p1", name: "Aria", abilities }) =>
  post(app, `/sessions/${id}/characters`, body);

describe("POST /sessions/:id/characters", () => {
  it("201 with the character sheet", async () => {
    const res = await character(await appWith([]));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ playerId: "p1", name: "Aria", abilities });
  });

  it("400 on invalid body", async () => {
    expect((await character(await appWith([]), "s1", { playerId: "p1" })).status).toBe(400);
  });

  it("400 when abilities are not a standard-array distribution", async () => {
    const res = await character(await appWith([]), "s1", { playerId: "p1", name: "A", abilities: { ...abilities, STR: 18 } });
    expect(res.status).toBe(400);
  });

  it("404 on unknown session", async () => {
    expect((await character(await appWith([]), "nope")).status).toBe(404);
  });

  it("403 when the player is not in the session", async () => {
    expect((await character(await appWith([]), "s1", { playerId: "p9", name: "Z", abilities })).status).toBe(403);
  });

  it("409 when the player already has a character", async () => {
    const app = await appWith([]);
    await character(app);
    expect((await character(app)).status).toBe(409);
  });
});

describe("POST /sessions/:id/turns", () => {
  const turn = (app: App, id = "s1", body: unknown = { playerId: "p1", action: "j'avance" }) =>
    post(app, `/sessions/${id}/turns`, body);

  it("201 with the narrated turn", async () => {
    const app = await appWith(['{"required": false}', "Tu avances."]);
    await character(app);
    const res = await turn(app);
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ number: 1, narration: "Tu avances." });
  });

  it("400 on invalid body", async () => {
    expect((await turn(await appWith([]), "s1", { playerId: "" })).status).toBe(400);
  });

  it("404 on unknown session", async () => {
    expect((await turn(await appWith([]), "nope")).status).toBe(404);
  });

  it("409 when the player has no character", async () => {
    expect((await turn(await appWith([]))).status).toBe(409);
  });

  it("502 when the arbiter answers garbage", async () => {
    const app = await appWith(["pas du json"]);
    await character(app);
    const res = await turn(app);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "gm_invalid_response" });
  });
});
