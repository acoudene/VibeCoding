# ADR-0012 — IaC GitHub avec OpenTofu

- Statut : Accepté · Date : 2026-10-10 · Décideur : utilisateur (OpenTofu, état R2)

## Décision
OpenTofu (open source) + provider `integrations/github` dans `infra/github/`. État distant sur Cloudflare R2 (API S3-compatible, tier gratuit). Authentification via PAT fine-grained fourni en variable d'environnement, jamais commité. Le dépôt `VibeCoding` est un monorepo existant : l'IaC ne gère que des ressources liées à `game-master` quand c'est possible ; le ruleset de `main` s'applique au dépôt entier ⇒ à valider avant `apply` (❓).
## Alternatives écartées
Terraform BSL (non open source), configuration manuelle.
## Conséquences
`tofu plan` en PR ; `apply` manuel.
## Vérification
CI : `tofu fmt -check` + `tofu validate`.
