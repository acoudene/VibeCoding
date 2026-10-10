import { Hono } from "hono";
import { z } from "zod";
import type { CreateCharacter } from "../../application/create-character";
import {
  CharacterAlreadyExistsError,
  CharacterNameRequiredError,
  CharacterRequiredError,
  InvalidAbilityAssignmentError,
  InvalidArbiterResponseError,
  PlayerNotInSessionError,
  SessionNotFoundError,
} from "../../application/errors";
import type { PlayTurn } from "../../application/play-turn";

const turnBody = z.object({ playerId: z.string().min(1), action: z.string().min(1) });
const characterBody = z.object({
  playerId: z.string().min(1),
  name: z.string().min(1),
  abilities: z.object({
    STR: z.number().int(),
    DEX: z.number().int(),
    CON: z.number().int(),
    INT: z.number().int(),
    WIS: z.number().int(),
    CHA: z.number().int(),
  }),
});

export function createApp(playTurn: PlayTurn, createCharacter: CreateCharacter) {
  const app = new Hono();

  app.post("/sessions/:id/turns", async (c) => {
    const parsed = turnBody.safeParse(await c.req.json().catch(() => undefined));
    if (!parsed.success) return c.json({ error: "invalid_request" }, 400);
    try {
      const turn = await playTurn.execute({ sessionId: c.req.param("id"), ...parsed.data });
      return c.json(turn, 201);
    } catch (e) {
      if (e instanceof SessionNotFoundError) return c.json({ error: "session_not_found" }, 404);
      if (e instanceof PlayerNotInSessionError) return c.json({ error: "player_not_in_session" }, 403);
      if (e instanceof CharacterRequiredError) return c.json({ error: "character_required" }, 409);
      if (e instanceof InvalidArbiterResponseError) return c.json({ error: "gm_invalid_response" }, 502);
      throw e;
    }
  });

  app.post("/sessions/:id/characters", async (c) => {
    const parsed = characterBody.safeParse(await c.req.json().catch(() => undefined));
    if (!parsed.success) return c.json({ error: "invalid_request" }, 400);
    try {
      const character = await createCharacter.execute({ sessionId: c.req.param("id"), ...parsed.data });
      return c.json(
        { playerId: character.playerId, name: character.name, abilities: character.abilities.toValues() },
        201,
      );
    } catch (e) {
      if (e instanceof SessionNotFoundError) return c.json({ error: "session_not_found" }, 404);
      if (e instanceof PlayerNotInSessionError) return c.json({ error: "player_not_in_session" }, 403);
      if (e instanceof CharacterAlreadyExistsError) return c.json({ error: "character_exists" }, 409);
      if (e instanceof InvalidAbilityAssignmentError || e instanceof CharacterNameRequiredError) {
        return c.json({ error: "invalid_request" }, 400);
      }
      throw e;
    }
  });

  return app;
}
