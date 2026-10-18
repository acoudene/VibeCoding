# ADR-0013 — Yjs, source de vérité de l'état du tableau

- Statut : Accepté · Date : 2026-10-18 · Décideur : utilisateur

## Contexte
Mono-utilisateur d'abord, mais le temps réel (sous-projet 005) ne doit pas imposer de réécriture.
## Décision
Un `Y.Doc` par tableau est la source de vérité de l'état. L'adaptateur `BoardStore` (infrastructure) mappe `Y.Doc ⇄ Board` ; le domaine ne connaît pas Yjs. Persistance : un Durable Object par tableau stocke l'état Yjs binaire ; au MVP, le client pousse ses mises à jour en différé (HTTP). La synchro WebSocket arrive en 005.
## Alternatives écartées
État JSON simple puis migration vers CRDT (réécriture) ; temps réel dès le MVP (complexité prématurée).
## Conséquences
Fusion de mises à jour concurrentes acquise à l'étape 005 ; mapping `Board ⇄ Y.Doc` à tester (Miniflare).
## Vérification
Règle `domain-no-npm` ; tests d'infrastructure du mapping.
