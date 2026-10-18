# Event Storming — de l'atelier au modèle DDD

Tableau blanc spécialisé **Event Storming** (UX inspirée de Miro) : post-its typés, liens, cadres de contextes bornés. À la fin de l'atelier, l'outil **génère un modèle DDD** (`domain-model.json` + `domain/README.md`) consommable par l'AI factory. Construit lui-même par une *AI factory* : agents et workflows IA (Claude Code, GitHub Copilot, Codex, Gemini CLI) qui produisent le code selon DDD, ADR et guidelines.

## Démarrage
```bash
npm install
npm run verify      # typecheck + unit + BDD + architecture + cohérence agents
```

## Structure
```
docs/        vision, DDD, ADR, guidelines, factory, specs/plans de design
factory/     SOURCE des agents et workflows (modifier ici)
src/         domain · application · infrastructure · presentation
tests/       unit · bdd (Cucumber FR) · architecture (règles dans .dependency-cruiser.cjs)
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
