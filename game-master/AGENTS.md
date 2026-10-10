# Game Master — instructions pour agents IA

Source de vérité unique, lue par Codex (`AGENTS.md`), importée par Claude Code (`CLAUDE.md`) et Gemini CLI (`GEMINI.md`), référencée par Copilot (`.github/instructions/game-master.instructions.md`).

## Projet
JdR multijoueur (règles D&D 5e SRD 5.1) animé par un Game Master IA composé de plusieurs agents. Exemple pilote d'une AI factory. Vision : `docs/00-vision.md`.

## Règle d'or : n'invente rien
Si une information métier, technique ou de périmètre manque ou est ambiguë : **pose la question à l'utilisateur** (une question synthétique, options proposées). Jamais d'hypothèse silencieuse. Toute décision structurante → ADR (`docs/adr/`), statut `Proposé` tant que l'utilisateur ne l'a pas accepté.

## Contraintes non négociables
- Technologies **gratuites ou open source** uniquement (ADR-0002).
- Stack : TypeScript, Hono, Cloudflare (Pages/Workers/Durable Objects/D1), Vitest, Cucumber, OpenTofu (ADR-0003, 0005).
- Architecture hexagonale + DDD, sens des dépendances `presentation → application → domain` ; `infrastructure → application/domain` (ADR-0004, `docs/guidelines/architecture-layers.md`).
- Docs, specs et prompts en **français** ; code et identifiants en **anglais**.
- Cycle Spec Kit : constitution → specify → clarify → plan → tasks → implement (`.specify/`, `specs/NNN-*/`).
- TDD : test rouge d'abord. Pas de code de production sans test (unitaire ou BDD).

## Où trouver quoi
| Besoin | Fichier |
|---|---|
| Langage ubiquitaire, contextes, agrégats | `docs/domain/` |
| Décisions d'architecture | `docs/adr/` |
| Règles par couche, anti-patterns | `docs/guidelines/` |
| Constitution Spec Kit | `.specify/memory/constitution.md` |
| Agents, effort, workflows | `docs/factory/`, `factory/` |
| Git, PR, CI | `docs/guidelines/git-and-pr.md` |

## Commandes
`npm run verify` = typecheck + tests unitaires + BDD + règles d'architecture + cohérence des fichiers d'agents. Doit être vert avant toute PR.

## Agents et workflows
Définitions canoniques dans `factory/agents/*.md` et `factory/workflows/*.md`. **Ne jamais éditer** les fichiers générés (`.claude/`, `.codex/`, `.gemini/`, `../.github/agents|prompts`) : modifier la source puis `npm run factory:sync`.
- Workflow `feature` : création de fonctionnalité (analyse → DDD → BDD → plan → implémentation par couche → tests → revue).
- Workflow `review` : revue de PR par agents spécialisés en parallèle.

Pour Codex (pas de commandes personnalisées) : « exécute le workflow `feature` » = lire et suivre `factory/workflows/feature.md`.
