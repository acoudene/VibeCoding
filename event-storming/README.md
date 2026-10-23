# Event Storming — de l'atelier au modèle DDD

Tableau blanc spécialisé **Event Storming** (UX inspirée de Miro) : post-its typés, liens, cadres de contextes bornés. À la fin de l'atelier, l'outil **génère un modèle DDD** (`domain-model.json` + `domain/README.md`) consommable par l'AI factory. Construit lui-même par une *AI factory* : agents et workflows IA (Claude Code, GitHub Copilot, Codex, Gemini CLI) qui produisent le code selon DDD, ADR et guidelines.

## Démarrage
```bash
npm install
npm run verify      # typecheck + unit + Workers (Miniflare) + BDD + architecture + cohérence agents
```

## Lancer l'application en local
Aucun compte Cloudflare n'est nécessaire : `wrangler dev` simule le Worker et le Durable Object (Miniflare).

- **Site construit** (comme en production) : `npm run build` puis `npx wrangler dev`, et ouvrir http://localhost:8787 (API `/api/*` et application, repli SPA).
- **Développement avec rechargement à chaud** : dans un terminal `npx wrangler dev` (API sur le port 8787 ; `dist/web` doit exister, donc un `npm run build` préalable), dans un autre `npm run dev`, et ouvrir l'adresse affichée par Vite (http://localhost:5173) ; Vite relaie `/api` vers `wrangler dev`.

## Tests
| Commande | Contenu |
|---|---|
| `npm run verify` | typecheck, tests unitaires, `test:workers`, BDD (Cucumber), règles d'architecture, `factory:check` ; vert avant toute PR |
| `npm run test:workers` | Durable Object et API Hono sous Miniflare (`@cloudflare/vitest-pool-workers`) |
| `npm run test:e2e` | Playwright de bout en bout ; construit le site et lance `wrangler dev` (port 8787). Localement, Microsoft Edge installé ; en CI, Chromium |
| `npm run test:e2e:perf` | Mesure 300 post-its + 300 liens (images par seconde journalisées, non bloquante en CI) |

## Structure
```
docs/        vision, DDD, ADR, guidelines, factory, specs/plans de design
factory/     SOURCE des agents et workflows (modifier ici)
src/         domain · application · infrastructure · presentation
tests/       unit · bdd (Cucumber FR) · workers (Miniflare) · e2e (Playwright) ; architecture : .dependency-cruiser.cjs
specs/       specs Spec Kit par fonctionnalité
.specify/    constitution et templates Spec Kit
```
Fichiers générés (ne pas éditer) : `.claude/`, `.codex/`, `.gemini/`, `../.github/agents/es-*`, `../.github/prompts/es-*`.

## Utiliser la factory
- Nouvelle fonctionnalité : `/es-feature "<besoin>"` (Claude/Gemini/Copilot) ou « exécute le workflow feature » (Codex).
- Revue : `/es-review`.
- Lire : `docs/factory/README.md`.

## Références
- Vision : `docs/00-vision.md`
- Design : `docs/superpowers/specs/2026-10-18-event-storming-design.md`
- ADR : `docs/adr/README.md`
