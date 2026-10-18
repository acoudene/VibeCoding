# Git, branches et PR (ADR-0009)

## Branches
- `main` : protégée, toujours déployable. Aucun push direct.
- Branches courtes (< 2 jours) : `feat/<spec-id>-<nom>`, `fix/…`, `docs/…`, `refactor/…`, `chore/…`, `ci/…`.
- Une branche = une spec (`specs/NNN-*`) ou une tâche.

## Commits
Conventional Commits : `feat(board): …`, `fix(modeling): …`, `docs(adr): …`, `chore(factory): …`. Scopes : `board`, `modeling`, `export`, `assistant`, `web`, `factory`, `adr`, `ci`, `event-storming` (transverse). Commits atomiques ; message au présent, en français ou anglais de façon cohérente avec l'historique.

## Pull requests
- Titre = Conventional Commit (sert de message de squash).
- Petites (< ~400 lignes utiles) ; template `../.github/PULL_REQUEST_TEMPLATE/event-storming.md`.
- Contenu : lien spec, ADR impactés, tests ajoutés, checklist qualité, captures si UI.
- Fusion : squash merge, branche supprimée, historique linéaire.
- Règles `main` : PR obligatoire, CI `event-storming-ci` verte, ≥ 1 approbation, conversations résolues, pas de force-push.
- CODEOWNERS : `event-storming/` → propriétaire du dépôt.

## Revue
Auteur : lancer `/es-review` en local avant d'ouvrir la PR ; coller le rapport de synthèse dans la PR. Relecteur humain : décision finale. Un finding `bloquant` empêche la fusion.
