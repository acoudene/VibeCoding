# ADR-0009 — Trunk-based, PR courtes, Conventional Commits

- Statut : Proposé · Date : 2026-10-18 · Décideur : à valider

## Décision
`main` protégée. Branches courtes `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, `ci/`. Une PR par spec/tâche, squash merge, titre en Conventional Commits `type(scope): résumé`, CODEOWNERS, template de PR `event-storming.md`, CI `event-storming-ci` verte obligatoire, ≥ 1 approbation humaine. Pas d'IaC propre à ce projet : les règles du dépôt sont gérées hors de `event-storming/`. Détail : `docs/guidelines/git-and-pr.md`.
## Alternatives écartées
GitFlow (trop lourd) ; IaC dupliquée du dépôt (conflit sur les mêmes ressources GitHub).
## Conséquences
Intégration continue ; revues petites.
## Vérification
CI + revue.
