# ADR-0005 — Hébergement Cloudflare

- Statut : Accepté · Date : 2026-10-18 · Décideur : utilisateur

## Contexte
Persistance d'un document CRDT par tableau, puis temps réel (WebSocket), gratuitement.
## Décision
Cloudflare : Pages (front React), Workers (API Hono), Durable Objects (un tableau = un objet ; état Yjs binaire ; WebSocket au sous-projet 005), D1 (liste des tableaux, métadonnées). Vérifier les quotas du tier gratuit avant chaque spec touchant l'infrastructure.
## Alternatives écartées
Serveur Node + base managée (mise en veille des tiers gratuits) ; service de synchro Yjs hébergé tiers.
## Conséquences
Runtime Workers (pas d'API Node complète) : l'infrastructure reste derrière des ports. Tests d'infrastructure via Miniflare (ADR-0008).
## Vérification
Revue ; CI de déploiement à créer par spec.
