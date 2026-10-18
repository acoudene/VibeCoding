# Game Master — AI factory pilote

JdR multijoueur D&D 5e SRD 5.1 animé par un Game Master IA multi-agents, construit par une *AI factory* : agents et workflows IA (Claude Code, GitHub Copilot, Codex, Gemini CLI) qui produisent le code selon DDD, ADR et guidelines.

## Démarrage
```bash
npm install
npm run verify      # typecheck + unit + BDD + architecture + cohérence agents
```
Le jeu appelle Ollama (`OLLAMA_MODEL`, défaut `llama3.2`) — jamais en test : les tests utilisent des LLM scriptés.

## Structure
```
docs/        vision, DDD, ADR, guidelines, description de la factory
factory/     SOURCE des agents et workflows (modifier ici)
src/         domain · application · infrastructure · presentation
tests/       unit · bdd (Cucumber FR) · architecture (règles dans .dependency-cruiser.cjs)
specs/       specs Spec Kit par fonctionnalité
.specify/    constitution et templates Spec Kit
infra/github IaC OpenTofu du dépôt (rulesets, secrets)
```
Fichiers générés (ne pas éditer) : `.claude/`, `.codex/`, `.gemini/`, `../.github/agents`, `../.github/prompts`.

## Utiliser la factory
- Nouvelle fonctionnalité : `/gm-feature "<besoin>"` (Claude/Gemini/Copilot) ou « exécute le workflow feature » (Codex).
- Revue : `/gm-review`.
- Lire : `docs/factory/README.md`.
