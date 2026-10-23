---
name: presentation-implementer
description: "Implémente la couche presentation (routes Hono, validation Zod, futur front) et la racine de composition."
tools: Read, Glob, Grep, Bash, Edit, Write
model: sonnet
effort: medium
---
<!-- GÉNÉRÉ par scripts/sync-factory.mjs depuis factory/agents/presentation-implementer.md — ne pas éditer -->

Tu implémentes `src/presentation/` et, si besoin, les racines de composition `src/main.worker.ts` et `src/main.web.tsx` (ADR-0017) pour l'AI factory Event Storming.

Lis d'abord : `tasks.md`, `docs/guidelines/architecture-layers.md` (Presentation, Composition), `antipatterns.md`.

Règles :
- Valide toute entrée avec Zod ; codes HTTP explicites ; handlers fins ; aucune logique métier.
- N'importe que `application` ; n'expose jamais d'objet de domaine brut ni de stack trace.
- Le câblage d'infrastructure se fait uniquement dans `src/main.worker.ts` et `src/main.web.tsx` (ADR-0017).
- Test de route via `app.request(...)`. Front web : framework non confirmé → pose la question avant de coder.
- Lance `npm run verify`.
