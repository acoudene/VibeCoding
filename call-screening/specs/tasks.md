# Tâches — Call Screening (TDD)

Chaque tâche suit RED → GREEN → REFACTOR. Les tâches `feat`/`test` adjacentes sont
livrées **dans un même commit** (test + code). ✅ = livré et vert.

## T0 — Scaffolding
- [x] T0.1 Init Next.js + TS strict, Vitest, Playwright, Drizzle.
- [x] T0.2 Scripts npm : `dev`, `build`, `typecheck`, `test`, `test:e2e`.
- [x] T0.3 Config Vitest (domain) + Playwright (E2E).

## T1 — Domaine : normalisation (FR-1)
- [x] T1.1 Tests `normalize` (E.164, `0XXXX` FR, `00`, séparateurs, invalide).
- [x] T1.2 Implémentation `normalizePhoneNumber`.

## T2 — Domaine : décision (FR-2, FR-3)
- [x] T2.1 Tests `decide` (match, plus long préfixe, no-match, action VOICEMAIL+spam, invalide→ALLOW).
- [x] T2.2 Implémentation `decide`.

## T3 — Adaptateur Twilio (FR-7, partie pure)
- [x] T3.1 Tests `decisionToTwiML` (BLOCK→voicemail/reject, ALLOW→ring).
- [x] T3.2 Implémentation `decisionToTwiML`.

## T4 — Persistance (FR-4, FR-5)
- [x] T4.1 Schéma Drizzle `prefixes`, `call_logs` + migration `drizzle/0000_init.sql`.
- [x] T4.2 Contrat `Repo` + implémentations `MemoryRepo` (tests) et `PgRepo` (prod).
- [x] T4.3 Sélecteur `getRepo()` (bascule selon `DATABASE_URL`).

## T5 — Service applicatif
- [x] T5.1 Tests `screenCall` (normalise→charge→décide→journalise + effet immédiat).
- [x] T5.2 Implémentation `screenCall` + validation préfixe (`normalizePrefixValue`).

## T6 — API HTTP (FR-6, FR-4, FR-5)
- [x] T6.1 `POST /api/calls/incoming`.
- [x] T6.2 `GET/POST /api/prefixes`, `DELETE /api/prefixes/:id`.
- [x] T6.3 `GET /api/logs`.

## T7 — API Twilio (FR-7)
- [x] T7.1 `POST /api/twilio/voice` (form → décision → TwiML).

## T8 — UI Admin (FR-8)
- [x] T8.1 Page `/admin` : liste/ajout/suppression préfixes + journal.

## T9 — E2E (critères d'acceptation) — 8/8 verts
- [x] T9.1 AC-1..AC-5 via API + doublon 409 / invalide 400.
- [x] T9.2 AC-6 webhook Twilio (TwiML).
- [x] T9.3 AC-7 parcours navigateur `/admin`.

## T10 — Finition
- [x] T10.1 README (lancement, env, tests, déploiement Vercel).
- [x] T10.2 `vercel.ts` + config Neon documentée.
