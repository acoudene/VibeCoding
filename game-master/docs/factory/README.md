# AI factory — agents, effort, workflows

Source unique : `factory/` → `npm run factory:sync` génère les fichiers de chaque outil (ADR-0013). `npm run factory:check` détecte la dérive (CI).

## Agents et effort (politique « par rôle »)
| Agent | Rôle | Effort | Accès | Claude `model` |
|---|---|---|---|---|
| `business-analyst` | Spec métier + questions | high | écriture docs | opus |
| `ddd-modeler` | Modèle DDD, langage ubiquitaire | **xhigh** | écriture docs | opus |
| `bdd-specifier` | Scénarios Gherkin FR | high | écriture | opus |
| `solution-architect` | Plan, tâches, contrôle ADR | high | écriture docs | opus |
| `domain-implementer` | Couche domain (TDD) | medium | écriture | sonnet |
| `application-implementer` | Cas d'usage, agents du MJ | medium | écriture | sonnet |
| `infrastructure-implementer` | Adaptateurs | medium | écriture | sonnet |
| `presentation-implementer` | HTTP / composition | medium | écriture | sonnet |
| `test-engineer` | Pyramide de tests | medium | écriture | sonnet |
| `doc-writer` | Synchro docs | low | écriture docs | haiku |
| `review-architecture-ddd` | Revue archi/DDD | high | lecture + shell | opus |
| `review-security` | Revue sécurité | high | lecture + shell | opus |
| `review-adr-guidelines` | Revue conformité | high | lecture + shell | opus |
| `review-quality` | Revue qualité | medium | lecture + shell | sonnet |
| `review-tests` | Revue des tests | medium | lecture + shell | sonnet |
| `review-synthesizer` | Synthèse + verdict | medium | lecture | sonnet |

## Support de l'effort par outil (vérifié dans les docs officielles, 2026-10-10)
| Outil | Fichiers générés | Effort | Modèle |
|---|---|---|---|
| Claude Code | `.claude/agents/*.md`, `.claude/commands/gm-*.md` | `effort:` (low…xhigh) | alias `model:` (haiku/sonnet/opus) |
| Codex | `.codex/agents/*.toml` (+ `AGENTS.md`) | `model_reasoning_effort` | non renseigné (hérite) ❓ |
| GitHub Copilot | `../.github/agents/gm-*.agent.md`, `prompts/`, `instructions/` | non supporté — indiqué dans le prompt | non renseigné ❓ |
| Gemini CLI | `.gemini/agents/*.md`, `.gemini/commands/gm-*.toml` | non supporté — indiqué dans le prompt | non renseigné ❓ |

Pour imposer un modèle par outil : renseigner `factory/models.json` (ne pas deviner les identifiants), puis `factory:sync`.

## Workflows
- **feature** (`factory/workflows/feature.md`) : besoin → spec → DDD → BDD → plan/ADR → implémentation couche par couche (TDD) → tests → docs → revue → PR. Quatre portes humaines (spec, modèle, plan/ADR, fusion).
- **review** (`factory/workflows/review.md`) : 5 relecteurs en parallèle → synthèse → verdict (bloquant ⇒ corrections requises).

Lancement : Claude `/gm-feature …` · Gemini `/gm-feature …` · Copilot (VS Code) prompt `gm-feature` · Codex : « exécute le workflow feature : … ».

## Ajouter un agent
Créer `factory/agents/<nom>.md` (`name`, `description`, `effort`, `access: read|review|write`), l'ajouter au workflow concerné, `npm run factory:sync`.
