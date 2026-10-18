# ADR-0014 — Pas de LLM en CI

- Statut : Accepté · Date : 2026-10-10 · Décideur : utilisateur

## Décision
La CI GitHub Actions est déterministe (typecheck, tests, BDD, architecture, cohérence agents, `tofu validate`). La revue par agents est lancée localement (`/gm-review`) ou via la revue Copilot native de GitHub si disponible ; ses conclusions sont postées en commentaire de PR par l'humain/l'outil.
## Alternatives écartées
Claude Code Action (clé API payante), script sur tier gratuit.
## Conséquences
Aucun secret LLM dans GitHub.
## Vérification
Absence de secret LLM dans `.github/workflows`.
