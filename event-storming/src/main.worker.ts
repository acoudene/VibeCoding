/** Racine de composition du Worker (ADR-0017) : câblera Hono et le Durable Object. */
export class BoardDurableObject {}

export default {
  fetch(): Response {
    return new Response("Event Storming", { status: 200 });
  },
};
