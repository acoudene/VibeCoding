# Blind Test

Application web pour animer des blind tests musicaux entre amis : un hôte crée une salle, partage un code court, les joueurs rejoignent depuis leur téléphone, l'hôte lance les morceaux YouTube et arbitre les buzzes en temps réel.

Spécification fonctionnelle : [`spec.md`](./spec.md). Plan d'architecture : [`plan.md`](./plan.md). Découpage en sous-tâches : [`tasks.md`](./tasks.md).

## Prérequis

- **Node.js ≥ 22**
- **pnpm ≥ 11** (via `corepack enable` ou install manuel)
- Pour les tests E2E en local : **Chromium** (installé automatiquement par `pnpm exec playwright install`)

## Installation

```bash
pnpm install
```

## Scripts

| Commande                | Effet                                                                            |
| ----------------------- | -------------------------------------------------------------------------------- |
| `pnpm dev`              | Lance le serveur Next.js en mode dev sur http://localhost:3000                   |
| `pnpm build`            | Build de production                                                              |
| `pnpm start`            | Démarre le build de production                                                   |
| `pnpm lint`             | ESLint (Next + simple-import-sort, no-console)                                   |
| `pnpm format`           | Prettier write sur tout le repo                                                  |
| `pnpm format:check`     | Prettier check (utilisé en CI)                                                   |
| `pnpm typecheck`        | `tsc --noEmit` avec strict + noUncheckedIndexedAccess                            |
| `pnpm test:unit`        | Vitest sur `tests/unit/**` et tests colocalisés `src/**/*.test.{ts,tsx}` (jsdom) |
| `pnpm test:integration` | Vitest sur `tests/integration/**` (node, use cases avec adapters in-memory)      |
| `pnpm test:arch`        | Vitest sur `tests/architecture/**` (interdit les imports cross-layer)            |
| `pnpm test`             | Enchaîne `test:unit`, `test:integration`, `test:arch`                            |
| `pnpm test:e2e`         | Playwright (build + start automatiques via `webServer`)                          |

## Structure

```
blind-test/
├── src/
│   ├── app/             # Routes Next.js (App Router) + API
│   ├── domain/          # Entités, value objects, règles métier (pures)
│   ├── application/     # Use cases, ports (interfaces)
│   └── infrastructure/  # Adapters concrets (Pusher, in-memory repos…)
├── tests/
│   ├── unit/            # Tests unitaires (jsdom)
│   ├── integration/     # Tests d'intégration des use cases
│   ├── architecture/    # Tests d'imports interdits entre couches
│   ├── e2e/             # Scénarios Playwright
│   └── setup/           # Setup files Vitest
├── plan.md              # Architecture cible
├── spec.md              # Spécification fonctionnelle
└── tasks.md             # Découpage en sous-tâches commit-par-commit
```

L'architecture suit une **hexagonale stricte** : `domain` ne dépend de rien, `application` ne dépend que de `domain`, `infrastructure` et `app` câblent les ports. Les violations sont attrapées par `pnpm test:arch`.

## Déploiement

Cible v1 : **Vercel** (front + API routes Next.js) avec **Pusher Channels** managé pour le temps réel.

Variables d'environnement à configurer côté hébergeur :

| Côté serveur (privées) | Côté client (`NEXT_PUBLIC_*`) |
| ---------------------- | ----------------------------- |
| `PUSHER_APP_ID`        | `NEXT_PUBLIC_PUSHER_KEY`      |
| `PUSHER_KEY`           | `NEXT_PUBLIC_PUSHER_CLUSTER`  |
| `PUSHER_SECRET`        |                               |
| `PUSHER_CLUSTER`       |                               |

En CI, le job E2E utilise un service container [soketi](https://github.com/soketi/soketi) (Pusher-compatible self-hosted) au lieu d'un compte Pusher.
