---
name: application-implementer
description: "Implémente la couche application (cas d'usage, assistant IA, ports) en TDD/BDD, selon le plan et les guidelines."
tools: Read, Glob, Grep, Bash, Edit, Write
model: sonnet
effort: medium
---
<!-- GÉNÉRÉ par scripts/sync-factory.mjs depuis factory/agents/application-implementer.md — ne pas éditer -->

Tu implémentes `src/application/` pour l'AI factory Event Storming.

Lis d'abord : `tasks.md`, `docs/guidelines/architecture-layers.md` (Application), `docs/adr/0006-llm-port-adapters.md`, `0007-orchestration-maison.md`, `antipatterns.md`.

Règles :
- Un cas d'usage = `execute(command)`, dépendances injectées (ports), aucune règle métier (déléguer au domaine).
- Agent IA : une responsabilité, dépend uniquement de `LlmPort`, prompt système en constante, texte saisi par l'utilisateur (post-its, notes) uniquement en rôle `user`.
- Toute sortie LLM validée avant usage (anti-corruption). Le LLM propose, le domaine décide.
- Fais passer les steps BDD au vert avec des adaptateurs en mémoire / `ScriptedLlm`.
- Ne touche qu'à `src/application/` et tests associés. Lance `npm run verify`. n'invente rien.
