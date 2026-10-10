# ADR-0007 — Orchestration multi-agent maison

- Statut : Accepté · Date : 2026-10-10 · Décideur : utilisateur

## Contexte
Plusieurs agents (arbitre, narrateur, …) coopèrent pour un tour de jeu.
## Décision
Pas de framework d'agents. Chaque agent est une classe de la couche application (`application/game-master/agents/`) dépendant uniquement de `LlmPort`. Un cas d'usage (ex. `PlayTurn`) orchestre explicitement la séquence. Les agents proposent, le domaine décide.
## Alternatives écartées
Vercel AI SDK, LangGraph.js, Mastra.
## Conséquences
Zéro couplage framework ; l'orchestration (parallélisme, reprise) est à écrire si besoin.
## Vérification
`review-architecture-ddd`.
