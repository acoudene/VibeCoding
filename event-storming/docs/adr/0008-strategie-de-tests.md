# ADR-0008 — Stratégie de tests

- Statut : Accepté · Date : 2026-10-18 · Décideur : utilisateur

## Décision
- TDD : test rouge d'abord ; les `.feature` sont écrites **avant** le code (agent `bdd-specifier`), en langage ubiquitaire.
- Unitaires Vitest (domaine) + **propriétés** fast-check (`deriveDomainModel` déterministe, indépendant de l'ordre d'insertion, conforme au JSON Schema).
- **Golden files** : tableaux de référence `tests/fixtures/boards/*.json` → `domain-model.json` et `README.md` attendus, dont un tableau reproduisant le domaine de `game-master`.
- BDD Cucumber en français ; infrastructure Vitest + Miniflare ; E2E Playwright sur les interactions retenues par l'ADR UX.
- Aucun appel réseau ni LLM réel : faux `LlmPort` scripté, horloge et identifiants injectés.
- Architecture testée par dependency-cruiser.
## Alternatives écartées
Tests uniquement E2E ; snapshots massifs non relus.
## Conséquences
Rapidité, déterminisme ; toute évolution du format d'export passe par une mise à jour revue des golden files.
## Vérification
`npm run verify` ; agent `review-tests`.
