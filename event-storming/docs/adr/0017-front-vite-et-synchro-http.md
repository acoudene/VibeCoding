# ADR-0017 — Front React + Vite, deux racines de composition, synchro HTTP par mises à jour Yjs

- Statut : Accepté · Date : 2026-10-18 · Décideur : utilisateur

## Contexte
Le sous-projet 002 ajoute une application web (React, ADR-0003 ; xyflow, ADR-0012) et un Worker (Hono, Durable Objects, ADR-0005). Les ADR existants ne fixent ni le bundler, ni l'organisation des points d'entrée, ni le protocole entre le navigateur et le Durable Object en mono-utilisateur.

## Décision
- **Bundler** : Vite (licence MIT) avec `@vitejs/plugin-react` ; le Worker est construit par `wrangler`.
- **Deux racines de composition** : `src/main.worker.ts` (Hono + Durable Object) et `src/main.web.tsx` (React + adaptateurs Yjs, HTTP, `localStorage`). Ce sont les seuls fichiers qui instancient l'infrastructure ; la règle `presentation-not-infrastructure` reste en vigueur.
- **Synchronisation mono-utilisateur** : le client envoie des mises à jour Yjs binaires regroupées (`POST /api/boards/:id/updates`, au plus toutes les 500 ms) ; le Durable Object les fusionne et renvoie l'état complet à l'ouverture (`GET /api/boards/:id`). La synchro WebSocket du sous-projet 005 remplacera ce transport sans changer le schéma du `Y.Doc`.
- **D1 non utilisé en 002** : la liste des tableaux est locale au navigateur (spec 002, Q2).

## Alternatives écartées
Next.js (rendu serveur inutile pour un canvas, hébergement moins direct sur Cloudflare) ; WebSocket dès 002 (complexité du sous-projet 005 avancée sans besoin mono-utilisateur) ; envoi de l'état complet à chaque modification (coût réseau croissant avec la taille du tableau).

## Conséquences
Deux `tsconfig` (Worker et web : DOM, JSX). Un tableau dont la page se ferme sans réseau peut perdre jusqu'à 500 ms de modifications (atténué par `sendBeacon`).

## Vérification
`npm run test:arch` (racines `main.*` seules autorisées à importer l'infrastructure) ; tests Miniflare du Durable Object ; E2E « rouvrir le navigateur restitue le tableau ».
