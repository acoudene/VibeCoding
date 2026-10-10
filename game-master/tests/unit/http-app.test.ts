import { describe, expect, it } from "vitest";
import { NarratorAgent } from "../../src/application/game-master/agents/narrator";
import { RulesArbiterAgent } from "../../src/application/game-master/agents/rules-arbiter";
import { PlayTurn } from "../../src/application/play-turn";
import { GameSession } from "../../src/domain/session/game-session";
import { ScriptedLlm } from "../../src/infrastructure/llm/scripted-llm";
import { InMemorySessionRepository } from "../../src/infrastructure/persistence/in-memory-session-repository";
import { createApp } from "../../src/presentation/http/app";

async function appWith(responses: string[]) {
  const repo = new InMemorySessionRepository();
  await repo.save(new GameSession("s1", ["p1"]));
  const llm = new ScriptedLlm(responses);
  return createApp(new PlayTurn(repo, new RulesArbiterAgent(llm), new NarratorAgent(llm), { roll: () => 15 }));
}

const post = (app: Awaited<ReturnType<typeof appWith>>, id: string, body: unknown) =>
  app.request(`/sessions/${id}/turns`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /sessions/:id/turns", () => {
  it("201 with the narrated turn", async () => {
    const app = await appWith(['{"required": false}', "Tu avances."]);
    const res = await post(app, "s1", { playerId: "p1", action: "j'avance" });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ number: 1, narration: "Tu avances." });
  });

  it("400 on invalid body", async () => {
    expect((await post(await appWith([]), "s1", { playerId: "" })).status).toBe(400);
  });

  it("404 on unknown session", async () => {
    expect((await post(await appWith([]), "nope", { playerId: "p1", action: "x" })).status).toBe(404);
  });
});
