/** Racine de composition du Worker (ADR-0017) : câblera Hono (U11) et le Durable Object. */
export { BoardDurableObject } from "./infrastructure/cloudflare/board-durable-object";

export default {
  fetch(): Response {
    return new Response("Event Storming", { status: 200 });
  },
};
