# ADR-0004 — Architecture hexagonale + DDD

- Statut : Accepté · Date : 2026-10-18 · Décideur : utilisateur

## Contexte
Le canvas, le CRDT, l'hébergement et le LLM sont volatils ; la grammaire Event Storming et la dérivation DDD doivent rester testables et déterministes.
## Décision
Quatre couches : `domain` (pur, sans dépendance npm : ni Yjs, ni xyflow, ni Hono), `application` (cas d'usage, ports), `infrastructure` (adaptateurs : Yjs, Durable Objects, LLM, exporteurs), `presentation` (API Hono, web React). Une racine de composition par point d'entrée. Détail : `docs/guidelines/architecture-layers.md`.
## Alternatives écartées
Logique métier dans les composants React ; état métier manipulé directement dans le `Y.Doc`.
## Conséquences
Plus de fichiers, mais domaine testable sans mock ; remplacement d'adaptateurs trivial.
## Vérification
`npm run test:arch` (règles `domain-is-pure`, `domain-no-npm`… dans `.dependency-cruiser.cjs`) + `review-architecture-ddd`.
