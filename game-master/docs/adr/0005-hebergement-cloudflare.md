# ADR-0005 — Hébergement Cloudflare

- Statut : Accepté · Date : 2026-10-10 · Décideur : utilisateur (Cloudflare) ; Hono/Durable Objects/D1 proposés

## Contexte
Multijoueur = temps réel (WebSocket) + persistance, gratuitement.
## Décision
Cloudflare : Pages (front), Workers (API Hono), Durable Objects (une salle = un objet, WebSocket), D1 (SQLite). Vérifier les quotas du tier gratuit avant chaque spec touchant l'infrastructure. Ollama n'est pas hébergeable gratuitement : en production le LLM est l'adaptateur « tier gratuit » (ADR-0006).
## Alternatives écartées
Render/Koyeb + Neon (mise en veille) ; Docker Compose local seul.
## Conséquences
Runtime Workers (pas d'API Node complète) : l'infrastructure doit rester derrière des ports. `src/main.ts` est un point de composition Node (dev) ; un point d'entrée Workers sera ajouté par une spec dédiée.
## Vérification
Revue ; CI de déploiement à créer par spec.
