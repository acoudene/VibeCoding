# Call Screening

Application de **filtrage des appels entrants** pour éviter le spam, basée sur une
**liste noire de préfixes téléphoniques**. Quand un appel provient d'un numéro dont le
préfixe est interdit, il est **renvoyé en messagerie** et **marqué comme spam**.

Construite en **Specification First** (façon Spec-Kit) avec un développement **TDD** et
des **tests End-To-End** couvrant tous les critères d'acceptation.

## Spécification

La spec est la source de vérité (dossier [`specs/`](./specs)) :

- [`specs/constitution.md`](./specs/constitution.md) — principes non négociables.
- [`specs/spec.md`](./specs/spec.md) — exigences fonctionnelles et critères d'acceptation.
- [`specs/plan.md`](./specs/plan.md) — architecture et plan technique.
- [`specs/tasks.md`](./specs/tasks.md) — découpage en tâches TDD.

## Stack

- **Next.js 15** (App Router) + **TypeScript** strict
- **PostgreSQL** (Neon via Vercel Marketplace) + **Drizzle ORM**
- **Vitest** (unitaire) + **Playwright** (E2E)
- Déployable sur **Vercel**

## Architecture

Le **cœur de décision** est indépendant de la téléphonie :

```
HTTP (webhook générique / Twilio) → screenCall() → normalize() + decide() → Repo (log) → réponse
```

- `src/domain/` — logique pure : normalisation E.164, décision liste noire. Sans I/O.
- `src/app-core/` — service `screenCall` (orchestration) + validation des préfixes.
- `src/db/` — contrat `Repo` avec deux implémentations : **Postgres** (prod) et
  **en mémoire** (tests / sans base configurée). Bascule automatique selon `DATABASE_URL`.
- `src/adapters/twilio.ts` — traduction d'une décision en **TwiML**.
- `src/app/api/` — endpoints HTTP. `src/app/admin/` — UI d'administration.

## Démarrage

```bash
npm install
cp .env.example .env        # renseigner DATABASE_URL (optionnel en dev : sinon mémoire)
npm run dev                 # http://localhost:3000  (admin : /admin)
```

> Sans `DATABASE_URL`, l'app utilise un dépôt **en mémoire** : idéal pour démo/dev,
> les données repartent à zéro au redémarrage. Avec une base Neon configurée, les
> préfixes et le journal sont persistés.

### Base de données (Neon / Postgres)

```bash
# Générer / appliquer le schéma
npm run db:push            # pousse le schéma directement
# ou
npm run db:migrate         # applique les migrations de ./drizzle
```

## API

| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| POST | `/api/calls/incoming` | `{ "from": "0899700000" }` | `{ decision, action, spam, matchedPrefix?, normalized }` |
| GET | `/api/prefixes` | — | `Prefix[]` |
| POST | `/api/prefixes` | `{ "value": "+33899", "label?": "…" }` | `Prefix` (201) · 409 doublon · 400 invalide |
| DELETE | `/api/prefixes/:id` | — | 204 · 404 |
| GET | `/api/logs` | — | `CallLog[]` (antéchronologique) |
| POST | `/api/twilio/voice` | form `From=…` | `text/xml` (TwiML) |

Exemple :

```bash
curl -X POST localhost:3000/api/prefixes -H 'content-type: application/json' -d '{"value":"+33899"}'
curl -X POST localhost:3000/api/calls/incoming -H 'content-type: application/json' -d '{"from":"0899700000"}'
# → {"decision":"BLOCK","action":"VOICEMAIL","spam":true,"matchedPrefix":"+33899","normalized":"+33899700000"}
```

## Intégration Twilio

Configurez le webhook « A CALL COMES IN » de votre numéro Twilio vers
`https://<votre-déploiement>/api/twilio/voice` (HTTP POST). Le même moteur de décision
est réutilisé ; un appel bloqué reçoit un TwiML qui annonce puis raccroche / redirige
vers la messagerie (`VOICEMAIL_URL` si défini).

## Tests

```bash
npm run typecheck     # TypeScript strict
npm test              # tests unitaires (Vitest) — domaine, service, validation
npm run test:e2e      # tests End-To-End (Playwright) — AC-1 à AC-7, toute la stack
```

Les tests E2E démarrent l'app en mode production avec un dépôt en mémoire (aucune base
requise) et vérifient les critères d'acceptation de la spec de bout en bout, y compris
un parcours navigateur sur `/admin`.

## Déploiement Vercel

1. Importer le repo dans Vercel.
2. Ajouter une base **Neon** depuis le Vercel Marketplace (renseigne `DATABASE_URL`).
3. Définir `DEFAULT_COUNTRY_CODE` (ex. `+33`) si besoin.
4. Appliquer le schéma (`npm run db:push` en local pointant vers la base, ou via CI).

> Ne pas définir `ENABLE_TEST_ENDPOINTS` en production (réservé aux tests E2E).

## Périmètre v1 / évolutions

Inclus : liste noire de préfixes, renvoi messagerie + marquage spam, CRUD préfixes,
journal, UI admin, webhook générique + adaptateur Twilio.

Évolutions prévues : canaux de notification réels (push/email/SMS), liste blanche /
exceptions, règles horaires & scoring, authentification de l'admin.
