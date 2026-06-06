# Tâches — Call Screening (TDD)

Chaque tâche suit RED → GREEN → REFACTOR. Les tâches `feat`/`test` adjacentes sont
livrées **dans un même commit** (test + code).

## T0 — Scaffolding
- [ ] T0.1 Init Next.js 16 + TS strict, Vitest, Playwright, Drizzle, ESLint.
- [ ] T0.2 Scripts npm : `dev`, `build`, `typecheck`, `test`, `test:e2e`.
- [ ] T0.3 Config Vitest (domain) + Playwright (E2E).

## T1 — Domaine : normalisation (FR-1)
- [ ] T1.1 Tests `normalize` (E.164, `0XXXX` FR, `00`, séparateurs, invalide).
- [ ] T1.2 Implémentation `normalizePhoneNumber`.

## T2 — Domaine : décision (FR-2, FR-3)
- [ ] T2.1 Tests `decide` (match, plus long préfixe, no-match, action VOICEMAIL+spam, invalide→ALLOW).
- [ ] T2.2 Implémentation `decide`.

## T3 — Adaptateur Twilio (FR-7, partie pure)
- [ ] T3.1 Tests `decisionToTwiML` (BLOCK→voicemail/reject, ALLOW→ring).
- [ ] T3.2 Implémentation `decisionToTwiML`.

## T4 — Persistance (FR-4, FR-5)
- [ ] T4.1 Schéma Drizzle `prefixes`, `call_logs` + migration.
- [ ] T4.2 Tests repo (CRUD préfixes, insert/list logs) [intégration, skip si pas de DB test].
- [ ] T4.3 Implémentation `repo`.

## T5 — Service applicatif
- [ ] T5.1 Tests `screenCall` (normalise→charge→décide→journalise).
- [ ] T5.2 Implémentation `screenCall`.

## T6 — API HTTP (FR-6, FR-4, FR-5)
- [ ] T6.1 `POST /api/calls/incoming`.
- [ ] T6.2 `GET/POST /api/prefixes`, `DELETE /api/prefixes/:id`.
- [ ] T6.3 `GET /api/logs`.

## T7 — API Twilio (FR-7)
- [ ] T7.1 `POST /api/twilio/voice` (form → décision → TwiML).

## T8 — UI Admin (FR-8)
- [ ] T8.1 Page `/admin` : liste/ajout/suppression préfixes + journal.

## T9 — E2E (critères d'acceptation)
- [ ] T9.1 AC-1..AC-5 via API (`/api/calls/incoming`, `/api/prefixes`, `/api/logs`).
- [ ] T9.2 AC-6 webhook Twilio (TwiML).
- [ ] T9.3 AC-7 parcours navigateur `/admin`.

## T10 — Finition
- [ ] T10.1 README (lancement, env, tests, déploiement Vercel).
- [ ] T10.2 `vercel.ts` / config déploiement + Neon.
