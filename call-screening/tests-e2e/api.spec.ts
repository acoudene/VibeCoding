import { test, expect } from "@playwright/test";

/**
 * E2E API — critères d'acceptation AC-1..AC-6 traversant toute la stack HTTP.
 * S'exécute contre le repo en mémoire (pas de DATABASE_URL en test).
 */

test.beforeEach(async ({ request }) => {
  // Réinitialise l'état entre chaque test (endpoint de test).
  await request.post("/api/test/reset");
});

test("AC-1/AC-3 : un préfixe interdit bloque l'appel et le renvoie en messagerie", async ({
  request,
}) => {
  const add = await request.post("/api/prefixes", { data: { value: "+33899", label: "spam FR" } });
  expect(add.status()).toBe(201);

  const res = await request.post("/api/calls/incoming", { data: { from: "0899700000" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body).toMatchObject({
    decision: "BLOCK",
    action: "VOICEMAIL",
    spam: true,
    matchedPrefix: "+33899",
    normalized: "+33899700000",
  });
});

test("AC-2 : un numéro sans préfixe correspondant est autorisé", async ({ request }) => {
  await request.post("/api/prefixes", { data: { value: "+33899" } });
  const res = await request.post("/api/calls/incoming", { data: { from: "+33612345678" } });
  const body = await res.json();
  expect(body.decision).toBe("ALLOW");
  expect(body.action).toBe("RING");
  expect(body.spam).toBe(false);
});

test("AC-4 : supprimer un préfixe laisse repasser un numéro auparavant bloqué", async ({
  request,
}) => {
  const add = await request.post("/api/prefixes", { data: { value: "+33899" } });
  const prefix = await add.json();

  let body = await (await request.post("/api/calls/incoming", { data: { from: "0899700000" } })).json();
  expect(body.decision).toBe("BLOCK");

  const del = await request.delete(`/api/prefixes/${prefix.id}`);
  expect(del.status()).toBe(204);

  body = await (await request.post("/api/calls/incoming", { data: { from: "0899700000" } })).json();
  expect(body.decision).toBe("ALLOW");
});

test("AC-5 : chaque évaluation est journalisée", async ({ request }) => {
  await request.post("/api/prefixes", { data: { value: "+33899" } });
  await request.post("/api/calls/incoming", { data: { from: "0899700000" } });
  await request.post("/api/calls/incoming", { data: { from: "+33612345678" } });

  const logs = await (await request.get("/api/logs")).json();
  expect(logs.length).toBe(2);
  // antéchronologique : le dernier appel en tête
  expect(logs[0].rawNumber).toBe("+33612345678");
  expect(logs[1].decision).toBe("BLOCK");
});

test("préfixe en doublon rejeté (409) et invalide (400)", async ({ request }) => {
  expect((await request.post("/api/prefixes", { data: { value: "+33899" } })).status()).toBe(201);
  expect((await request.post("/api/prefixes", { data: { value: "0899" } })).status()).toBe(409);
  expect((await request.post("/api/prefixes", { data: { value: "spam" } })).status()).toBe(400);
});

test("AC-6 : le webhook Twilio renvoie du TwiML de rejet pour un préfixe interdit", async ({
  request,
}) => {
  await request.post("/api/prefixes", { data: { value: "+33899" } });

  const res = await request.post("/api/twilio/voice", {
    form: { From: "+33899700000", To: "+33123456789" },
  });
  expect(res.headers()["content-type"]).toContain("xml");
  const xml = await res.text();
  expect(xml).toContain("<Response>");
  expect(xml).toMatch(/<Hangup|<Redirect|messagerie/i);
});
