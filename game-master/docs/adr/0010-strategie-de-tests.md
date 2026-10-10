# ADR-0010 — Stratégie de tests

- Statut : Proposé · Date : 2026-10-10 · Décideur : à valider

## Décision
- Pyramide : unitaires Vitest (domaine, parsing ACL) > BDD Cucumber en français (comportements métier via cas d'usage) > E2E (❓ Playwright, à décider avec le front).
- Les scénarios `.feature` sont écrits **avant** le code (agent `bdd-specifier`), langage ubiquitaire.
- Aucun appel réseau/LLM réel : `ScriptedLlm`, dés injectés.
- Architecture testée par dependency-cruiser.
## Alternatives écartées
Tests uniquement E2E ; mocks de framework.
## Conséquences
Rapidité, déterminisme.
## Vérification
`npm run verify` ; agent `review-tests`.
