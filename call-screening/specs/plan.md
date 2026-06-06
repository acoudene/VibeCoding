# Plan technique — Call Screening

Référence : `specs/spec.md`, `specs/constitution.md`.

## 1. Architecture

```
                 ┌─────────────────────────────────────────────┐
                 │                Next.js (App Router)          │
                 │                                              │
  Twilio  ──────▶│  /api/twilio/voice   ──┐                     │
  (TwiML)        │                        │                     │
                 │  /api/calls/incoming ──┼──▶  decideForNumber │  ◀── cœur, sans I/O réseau
  Webhook ──────▶│                        │        (domain)     │
  générique      │  /api/prefixes  (CRUD) │           │         │
                 │  /api/logs      (read) │           ▼         │
                 │  /admin (UI)           │        Drizzle      │
                 └────────────────────────┴───────────┬─────────┘
                                                       ▼
                                                  PostgreSQL (Neon)
```

### Couches
- **domain/** — pur TypeScript, sans dépendance framework/DB :
  - `normalize.ts` : `normalizePhoneNumber(raw, defaultCountryCode) -> { e164 | null }`.
  - `decision.ts` : `decide(normalized, prefixes[]) -> Decision` (FR-2, FR-3).
  - `types.ts` : `Decision`, `Action`, `Prefix`, `CallLog`.
- **db/** — schéma Drizzle + accès :
  - `schema.ts` : tables `prefixes`, `call_logs`.
  - `repo.ts` : `listPrefixes`, `addPrefix`, `removePrefix`, `insertLog`, `listLogs`.
- **app/** — services applicatifs orchestrant domain + repo :
  - `screenCall(raw)` : normalise → charge préfixes → décide → journalise → retourne.
- **app/api/** — routes HTTP (cœur générique + Twilio + CRUD + logs).
- **app/admin/** — UI.
- **adapters/twilio.ts** — `decisionToTwiML(decision)`.

## 2. Modèle de données

```sql
prefixes(
  id          uuid pk default gen_random_uuid(),
  value       text not null unique,   -- E.164 normalisé, ex "+33899"
  label       text,
  created_at  timestamptz not null default now()
)

call_logs(
  id            uuid pk default gen_random_uuid(),
  raw_number    text not null,
  normalized    text,                 -- null si invalide
  decision      text not null,        -- 'ALLOW' | 'BLOCK'
  action        text not null,        -- 'RING' | 'VOICEMAIL'
  matched_prefix text,                -- null si ALLOW
  spam          boolean not null default false,
  created_at    timestamptz not null default now()
)
```

## 3. Contrats d'API

| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| POST | `/api/calls/incoming` | `{from}` | `{decision,action,spam,matchedPrefix?,normalized}` |
| POST | `/api/twilio/voice` | form `From=...` | `text/xml` TwiML |
| GET | `/api/prefixes` | — | `Prefix[]` |
| POST | `/api/prefixes` | `{value,label?}` | `Prefix` (201) / 409 si doublon / 400 si invalide |
| DELETE | `/api/prefixes/:id` | — | 204 / 404 |
| GET | `/api/logs` | — | `CallLog[]` (antéchronologique) |

## 4. Stratégie de test (TDD)

1. **Unitaires (Vitest)** — domain d'abord, sans DB :
   - `normalize` : E.164, national FR, `00`, séparateurs, invalide.
   - `decide` : match simple, plus long préfixe gagne, aucun match, action VOICEMAIL+spam.
   - `decisionToTwiML` : BLOCK→reject/voicemail, ALLOW→ring.
2. **Intégration repo (Vitest)** — contre une base de test (ou Neon de test) :
   CRUD préfixes + insert/list logs. Skippable si pas de `DATABASE_URL` de test.
3. **E2E (Playwright)** — critères AC-1..AC-7 :
   - via HTTP (`request` fixture) pour l'API,
   - via navigateur pour `/admin`.
   - Base réelle (Neon) ou Postgres local éphémère. Reset entre tests.

Ordre RED→GREEN imposé : un test échoue avant l'implémentation correspondante.

## 5. Configuration / env

- `DATABASE_URL` — Postgres Neon.
- `DEFAULT_COUNTRY_CODE` — défaut `+33`.
- `.env.test` pour la base de test E2E/intégration.

## 6. Découpage de livraison

Voir `specs/tasks.md`. Principe : domain → services+DB → API → Twilio → UI, chaque étape
en TDD, les E2E validant la valeur métier de bout en bout.
