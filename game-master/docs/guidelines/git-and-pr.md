# Git, branches et PR (ADR-0011)

## Branches
- `main` : protégée, toujours déployable. Aucun push direct.
- Branches courtes (< 2 jours) : `feat/<spec-id>-<nom>`, `fix/…`, `docs/…`, `refactor/…`, `chore/…`, `ci/…`.
- Une branche = une spec (`specs/NNN-*`) ou une tâche.

## Commits
Conventional Commits : `feat(play): …`, `fix(rules): …`, `docs(adr): …`, `chore(factory): …`. Scopes : `play`, `gm`, `rules`, `characters`, `infra`, `factory`, `adr`, `ci`. Commits atomiques ; message au présent, en français ou anglais de façon cohérente avec l'historique.

## Pull requests
- Titre = Conventional Commit (sert de message de squash).
- Petites (< ~400 lignes utiles) ; template `../.github/PULL_REQUEST_TEMPLATE/game-master.md`.
- Contenu : lien spec, ADR impactés, tests ajoutés, checklist qualité, captures si UI.
- Fusion : squash merge, branche supprimée, historique linéaire.
- Règles `main` (IaC) : PR obligatoire, CI `game-master-ci` verte, ≥ 1 approbation, conversations résolues, pas de force-push.
- CODEOWNERS : `game-master/` → propriétaire du dépôt.

## Revue
Auteur : lancer `/gm-review` en local avant d'ouvrir la PR ; coller le rapport de synthèse dans la PR. Relecteur humain : décision finale. Un finding `bloquant` empêche la fusion.
