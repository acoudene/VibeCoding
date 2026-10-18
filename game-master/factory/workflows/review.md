---
description: Workflow revue de PR — 5 relecteurs spécialisés en parallèle puis synthèse. Argument optionnel : n° de PR ou branche (défaut : branche courante vs main).
---
# Workflow `review`

Entrée : `$ARGUMENTS` (PR/branche ; défaut `git diff main...HEAD`). Lecture seule : aucune modification de code.

1. Préparer : lister fichiers modifiés (`git diff --stat main...HEAD`), identifier la spec liée.
2. **En parallèle** (sous-agents indépendants, chacun reçoit le diff et son référentiel) :
   - `review-architecture-ddd` (high)
   - `review-quality` (medium)
   - `review-security` (high)
   - `review-tests` (medium) — exécute `npm run verify`
   - `review-adr-guidelines` (high)
   Si l'outil ne gère pas le parallélisme : les exécuter l'un après l'autre.
3. `review-synthesizer` (medium) : déduplique, vérifie chaque finding contre le code, classe, rend le verdict.
4. Restituer le rapport Markdown. Si une PR existe et que l'utilisateur le demande : le poster en commentaire (`gh pr comment`). Jamais de commentaire automatique sans demande (ADR-0014).

Chaque finding : sévérité (bloquant/majeur/mineur), `fichier:ligne`, règle, problème, correctif. Aucun finding sans preuve.
