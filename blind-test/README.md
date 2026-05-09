# Blind Test

Application web pour animer des blind tests musicaux entre amis : un hôte crée une salle, partage un code court, les joueurs rejoignent depuis leur téléphone, l'hôte lance les morceaux YouTube et arbitre les buzzes en temps réel.

Spécification fonctionnelle : [`spec.md`](./spec.md). Plan d'architecture : [`plan.md`](./plan.md). Découpage en sous-tâches : [`tasks.md`](./tasks.md).

## v1.1 — Mode saisie + tchat

- **Mode de réponse** : choisi par l'hôte avant de démarrer la partie.
  - **Buzz** (par défaut) : les joueurs buzzent ; l'hôte arbitre vocalement.
  - **Saisie** : les joueurs saisissent **titre + auteur** ; l'auto-validation tranche `correct` (1 pt) / `half` (0,5 pt) / `wrong` (0 pt) après normalisation et tolérance Levenshtein ≤ 2. L'hôte peut **overrider** le résultat de chaque joueur.
- **Tchat de salle** : disponible en lobby et pendant la partie. Chaque participant voit l'historique en arrivant. L'hôte peut **fermer** le tchat (les joueurs ne peuvent plus écrire, l'hôte si).
- **Anti-fuite** : en mode saisie, les autres joueurs voient uniquement `•••` jusqu'à la résolution du tour. Le contenu en clair des soumissions ne transite que par un canal Pusher privé `private-host-{code}` réservé à l'hôte.

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

### 1. Compte Pusher

1. Créer une app sur https://dashboard.pusher.com/ (Channels → Create app).
2. Choisir un cluster proche (ex : `eu`).
3. Récupérer les 4 valeurs depuis l'onglet "App Keys" : `app_id`, `key`, `secret`, `cluster`.

### 2. Variables d'environnement

| Côté serveur (privées) | Côté client (`NEXT_PUBLIC_*`) |
| ---------------------- | ----------------------------- |
| `PUSHER_APP_ID`        | `NEXT_PUBLIC_PUSHER_KEY`      |
| `PUSHER_KEY`           | `NEXT_PUBLIC_PUSHER_CLUSTER`  |
| `PUSHER_SECRET`        |                               |
| `PUSHER_CLUSTER`       |                               |

Pour un test local avec un Pusher self-host (soketi via Docker), il existe aussi `PUSHER_HOST` / `PUSHER_PORT` / `PUSHER_USE_TLS=false` (et leurs équivalents `NEXT_PUBLIC_*`).

### 3. Vercel

```bash
pnpm dlx vercel link        # premier déploiement
pnpm dlx vercel              # déploie une preview
pnpm dlx vercel --prod       # déploie en prod
```

Renseigner les 6 variables ci-dessus dans **Vercel → Settings → Environment Variables** (Production + Preview).

### 4. Smoke test prod

À faire manuellement après le premier déploiement :

1. Créer une salle depuis l'URL `*.vercel.app`.
2. Rejoindre depuis un 2ème onglet/device avec le code généré.
3. Démarrer la partie, jouer 1 morceau, valider.
4. Vérifier l'écran de fin.

En cas d'erreur d'authentification Pusher, vérifier `/api/rooms/[code]/pusher-auth` et la console réseau du navigateur.

### CI

En CI, le job E2E utilise un service container [soketi](https://github.com/soketi/soketi) (Pusher-compatible self-hosted) au lieu d'un compte Pusher. Les specs tagguées avec `test.skip(!HAS_PUSHER, …)` sont automatiquement sautées si les vars ne sont pas définies, ce qui rend `pnpm test:e2e` exécutable en local sans Pusher.
