# ADR-0003 — TypeScript full-stack

- Statut : Accepté · Date : 2026-10-18 · Décideur : utilisateur

## Contexte
Un seul langage client/serveur, hébergeable gratuitement ; le domaine est partagé entre le navigateur (retour instantané) et le serveur (génération qui fait foi).
## Décision
TypeScript (mode `strict`) partout. Serveur : Hono. Front : React (requis par xyflow, ADR-0012). Tests : Vitest, Cucumber.js (BDD), Playwright (E2E), dependency-cruiser (architecture). Validation aux frontières : Zod.
## Alternatives écartées
.NET, Python (domaine non partageable avec le navigateur).
## Conséquences
`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` activés. Le domaine doit rester exécutable dans le navigateur et sur Workers (aucune API Node).
## Vérification
`npm run typecheck`.
