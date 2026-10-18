# ADR-0011 — Trunk-based, PR courtes, Conventional Commits

- Statut : Proposé · Date : 2026-10-10 · Décideur : à valider

## Décision
`main` protégée (ruleset OpenTofu). Branches courtes `feat/`, `fix/`, `docs/`, `chore/`, `refactor/` + description (`feat/ability-check-turn`). Une PR par spec/tâche, squash merge, titre en Conventional Commits `type(scope): résumé`, CODEOWNERS, template de PR, historique linéaire, CI verte obligatoire, ≥ 1 approbation humaine, conversations résolues. Détail : `docs/guidelines/git-and-pr.md`.
## Alternatives écartées
GitFlow (trop lourd pour un petit dépôt).
## Conséquences
Intégration continue ; revues petites.
## Vérification
Ruleset GitHub (IaC) + CI.
