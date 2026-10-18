# ADR-0003 — TypeScript full-stack

- Statut : Accepté · Date : 2026-10-10 · Décideur : utilisateur (stack) ; outillage associé proposé

## Contexte
Utilisateur issu de l'écosystème Microsoft ; besoin d'un seul langage client/serveur, hébergeable gratuitement.
## Décision
TypeScript (mode `strict`) partout. Serveur : Hono. Tests : Vitest (unitaire), Cucumber.js (BDD), dependency-cruiser (architecture). Validation aux frontières : Zod. Front web : **Proposé : React + Vite sur Cloudflare Pages, interface de chat** (choix utilisateur du 2026-10-10, à formaliser par une spec front avant implémentation).
## Alternatives écartées
.NET (hébergement gratuit moins simple), Python.
## Conséquences
Typage proche de C# ; `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` activés.
## Vérification
`npm run typecheck`.
