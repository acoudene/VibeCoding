import { Hono } from "hono";
import { z } from "zod";
import { PlayTurn, SessionNotFoundError } from "../../application/play-turn";

const body = z.object({ playerId: z.string().min(1), action: z.string().min(1) });

export function createApp(playTurn: PlayTurn) {
  const app = new Hono();

  app.post("/sessions/:id/turns", async (c) => {
    const parsed = body.safeParse(await c.req.json().catch(() => undefined));
    if (!parsed.success) return c.json({ error: "invalid_request" }, 400);
    try {
      const turn = await playTurn.execute({ sessionId: c.req.param("id"), ...parsed.data });
      return c.json(turn, 201);
    } catch (e) {
      if (e instanceof SessionNotFoundError) return c.json({ error: "session_not_found" }, 404);
      throw e;
    }
  });

  return app;
}
