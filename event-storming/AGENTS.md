# Event Storming — instructions pour agents IA

Source de vérité unique, lue par Codex (`AGENTS.md`), importée par Claude Code (`CLAUDE.md`) et Gemini CLI (`GEMINI.md`), référencée par Copilot (`.github/instructions/event-storming.instructions.md`).

## Projet
Outil de tableau blanc **spécialisé Event Storming** (UX inspirée de Miro) qui **génère un modèle DDD** à la fin d'un atelier. Le `domain-model.json` exporté est un contrat consommé par l'AI factory. 2ᵉ projet de l'AI factory, autonome. Vision : `docs/00-vision.md` ; design : `docs/superpowers/specs/2026-10-18-event-storming-design.md`.

## Règle d'or : n'invente rien
Si une information métier, technique ou de périmètre manque ou est ambiguë : **pose la question à l'utilisateur** (une question synthétique, options proposées). Jamais d'hypothèse silencieuse. Toute décision structurante → ADR (`docs/adr/`), statut `Proposé` tant que l'utilisateur ne l'a pas accepté.

## Contraintes non négociables
- Technologies **gratuites ou open source** uniquement (ADR-0002).
- Stack : TypeScript, React + xyflow (web), Yjs, Hono, Cloudflare (Pages/Workers/Durable Objects/D1), Vitest, Cucumber, Playwright (ADR-0003, 0005, 0012, 0013).
- Architecture hexagonale + DDD, sens des dépendances `presentation → application → domain` ; `infrastructure → application/domain` (ADR-0004, `docs/guidelines/architecture-layers.md`). Le domaine n'importe ni Yjs, ni xyflow, ni Hono.
- **Le tableau est l'unique source de vérité** ; le modèle DDD en est dérivé de façon déterministe. Le LLM propose des suggestions, il ne modifie jamais le modèle (ADR-0006).
- Contrat d'export `domain-model.json` versionné (`schemaVersion`) : tout changement incompatible = nouvelle version majeure (ADR-0014).
- Docs, specs et prompts en **français** ; code et identifiants en **anglais**.
- Cycle Spec Kit : constitution → specify → clarify → plan → tasks → implement (`.specify/`, `specs/NNN-*/`) (ADR-0007).
- TDD : test rouge d'abord. Pas de code de production sans test (unitaire ou BDD). Aucun LLM réel en test ni en CI (ADR-0008, 0011).
- Aucune dépendance vers `game-master/` (ADR-0010).

## Où trouver quoi
| Besoin | Fichier |
|---|---|
| Langage ubiquitaire, contextes, agrégats | `docs/domain/` |
| Décisions d'architecture | `docs/adr/` |
| Règles par couche, anti-patterns | `docs/guidelines/` |
| Constitution Spec Kit | `.specify/memory/constitution.md` |
| Agents, effort, workflows | `docs/factory/`, `factory/` |
| Git, PR, CI | `docs/guidelines/git-and-pr.md` |
| Observation de Miro (REA), UX retenue | `docs/research/miro-observation.md`, ADR-0015, ADR-0016 |

## Commandes
`npm run verify` = typecheck + tests unitaires + tests Workers (Durable Object et API sous Miniflare, `test:workers`) + BDD + règles d'architecture + cohérence des fichiers d'agents. Doit être vert avant toute PR. E2E (hors `verify`) : `npm run test:e2e`.

## Agents et workflows
Définitions canoniques dans `factory/agents/*.md` et `factory/workflows/*.md`. **Ne jamais éditer** les fichiers générés (`.claude/`, `.codex/`, `.gemini/`, `../.github/agents/es-*`, `../.github/prompts/es-*`, `../.github/instructions/event-storming.instructions.md`) : modifier la source puis `npm run factory:sync`.
- Workflow `feature` : création de fonctionnalité (analyse → DDD → BDD → plan → implémentation par couche → tests → revue). Accepte un `domain-model.json` en entrée.
- Workflow `review` : revue de PR par agents spécialisés en parallèle.

Pour Codex (pas de commandes personnalisées) : « exécute le workflow `feature` » = lire et suivre `factory/workflows/feature.md`.
