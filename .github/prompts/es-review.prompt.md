---
description: "Workflow revue de PR — 5 relecteurs spécialisés en parallèle puis synthèse. Argument optionnel : n° de PR ou branche (défaut : branche courante vs main)."
agent: agent
---
<!-- GÉNÉRÉ par scripts/sync-factory.mjs depuis factory/workflows/review.md — ne pas éditer -->

Exécute le workflow défini dans `event-storming/factory/workflows/review.md` (lis-le en entier et suis chaque phase et chaque porte). Les agents sont décrits dans `event-storming/factory/agents/`. Règle absolue : n'invente rien, pose la question.

Arguments : ${input:request:Besoin ou cible}
