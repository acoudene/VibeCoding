# ADR-0011 — Pas de LLM en CI

- Statut : Accepté · Date : 2026-10-18 · Décideur : utilisateur

## Décision
La CI GitHub Actions est déterministe (typecheck, tests, BDD, architecture, cohérence agents). La revue par agents est lancée localement (`/es-review`) ; ses conclusions sont collées dans la PR.
## Alternatives écartées
Action de revue LLM en CI (clé API payante).
## Conséquences
Aucun secret LLM dans GitHub.
## Vérification
Absence de secret LLM dans `.github/workflows/event-storming-ci.yml`.
