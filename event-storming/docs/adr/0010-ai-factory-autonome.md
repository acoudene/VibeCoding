# ADR-0010 — AI factory autonome, copiée du socle

- Statut : Accepté · Date : 2026-10-18 · Décideur : utilisateur

## Contexte
Quatre outils (Claude Code, Copilot, Codex, Gemini CLI) aux formats différents ; risque de dérive. Ce projet doit être autonome tout en partant du même socle que `game-master`.
## Décision
Une source : `factory/agents/*.md` (rôle, effort, accès) et `factory/workflows/*.md`. `scripts/sync-factory.mjs` génère les fichiers de chaque outil ; `npm run factory:check` échoue en cas de dérive. Socle **copié** depuis `game-master` (commit `7542b25`) puis adapté ; aucune dépendance d'exécution ni d'outillage vers `game-master`. Les fichiers générés partagés à la racine du monorepo portent le préfixe `es-` ; le script ne supprime que les fichiers obsolètes de ce préfixe. Une extraction commune vers `ai-factory/` serait une décision séparée (nouvel ADR).
## Alternatives écartées
Extraction préalable de la factory dans `ai-factory/` (chantier distinct ; il faut deux utilisateurs pour connaître le commun) ; maintenance manuelle de 4 jeux de fichiers.
## Conséquences
Divergence assumée entre les deux factories. Les fichiers générés sont commités mais non éditables.
## Vérification
`factory:check` en CI ; test `tests/unit/factory/sync-factory.test.ts` (préfixe, non-suppression des fichiers d'un autre projet).
