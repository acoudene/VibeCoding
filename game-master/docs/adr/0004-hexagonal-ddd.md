# ADR-0004 — Architecture hexagonale + DDD

- Statut : Proposé · Date : 2026-10-10 · Décideur : à valider

## Contexte
Le LLM et l'hébergement sont volatils ; les règles de jeu doivent rester testables et déterministes.
## Décision
Quatre couches : `domain` (pur, sans dépendance npm), `application` (cas d'usage, agents, ports), `infrastructure` (adaptateurs), `presentation` (HTTP). Racine de composition unique : `src/main.ts`. Détail : `docs/guidelines/architecture-layers.md`.
## Alternatives écartées
Architecture en couches classique (domaine couplé à la persistance) ; CRUD sans domaine.
## Conséquences
Plus de fichiers, mais domaine testable sans mock ; remplacement d'adaptateurs trivial.
## Vérification
`npm run test:arch` (règles dans `.dependency-cruiser.cjs`) + `review-architecture-ddd`.
