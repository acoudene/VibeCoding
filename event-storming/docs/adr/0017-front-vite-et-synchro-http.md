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
Deux `tsconfig` (Worker et web : DOM, JSX).

Fermeture de la page (US-6) : quand la page est masquée ou fermée (`visibilitychange` → `hidden`, `pagehide`), le texte en cours de saisie est validé puis tout ce qui n'est pas confirmé par le serveur est confié à `navigator.sendBeacon`, y compris en « Erreur d'enregistrement » ; tant que l'état n'est pas « Enregistré » (ou qu'une saisie en cours modifie le tableau), le navigateur demande confirmation avant de quitter (`beforeunload`). Risque résiduel, assumé : `sendBeacon` ne garantit que la mise en file, pas la réception. Sont perdues, sans que l'utilisateur puisse en être averti une fois la page fermée, les modifications non confirmées quand :
- la page se ferme hors ligne ou alors que le serveur refuse les mises à jour (404, 413…) ;
- la charge dépasse la limite de `sendBeacon` (64 Kio en attente, par exemple après une longue période hors ligne) : le navigateur refuse l'envoi ;
- le navigateur ou l'onglet est tué sans événement (plantage, fin de processus) : jusqu'à 500 ms de modifications, plus tout ce qui n'était pas encore confirmé ;
- l'utilisateur confirme quand même la sortie malgré l'avertissement.

Un envoi par balise n'est jamais tenu pour enregistré : si la page reste ouverte, les envois et nouveaux essais continuent (la fusion côté serveur est idempotente) et l'indicateur reste exact. La synchronisation hors ligne persistante (file locale rejouée à la réouverture) est hors périmètre 002.

## Vérification
`npm run test:arch` (racines `main.*` seules autorisées à importer l'infrastructure) ; tests Miniflare du Durable Object ; E2E « rouvrir le navigateur restitue le tableau ».
