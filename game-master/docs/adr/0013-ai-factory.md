# ADR-0013 — Agents canoniques synchronisés multi-outils

- Statut : Proposé · Date : 2026-10-10 · Décideur : à valider

## Contexte
Quatre outils (Claude Code, Copilot, Codex, Gemini CLI) aux formats différents ; risque de dérive.
## Décision
Une source : `factory/agents/*.md` (rôle, effort, accès) et `factory/workflows/*.md`. `scripts/sync-factory.mjs` génère les fichiers de chaque outil ; `npm run factory:check` échoue en cas de dérive. Effort par agent exprimé en `low|medium|high|xhigh` ; appliqué là où l'outil le supporte (Claude `effort`, Codex `model_reasoning_effort`) ; Copilot et Gemini ne documentent pas ce réglage ⇒ effort indiqué dans le prompt uniquement.
## Alternatives écartées
Maintenance manuelle de 4 jeux de fichiers.
## Conséquences
Les fichiers générés sont commités mais non éditables.
## Vérification
`factory:check` en CI.
