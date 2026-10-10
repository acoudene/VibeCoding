# IaC GitHub (OpenTofu) — ADR-0012

Gère le ruleset de protection de la branche par défaut du dépôt `acoudene/VibeCoding`.

## Prérequis
- OpenTofu ≥ 1.8 (`tofu`) — non installé sur cette machine.
- PAT fine-grained (permission *Administration: read/write* sur le dépôt) : `export GITHUB_TOKEN=…`
- Bucket Cloudflare R2 + clés d'API S3 : `export AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=…`

## Utilisation
```bash
tofu init \
  -backend-config="bucket=<bucket-r2>" \
  -backend-config="endpoints={s3=\"https://<account-id>.r2.cloudflarestorage.com\"}"
tofu plan
tofu apply   # manuel, après relecture du plan
```

## Points à décider avant `active`
1. Le ruleset couvre **tout le monorepo** (autres projets inclus).
2. Les rulesets sur dépôt privé exigent un plan GitHub payant : confirmer la visibilité du dépôt.
3. `required_checks` vide : le workflow `game-master-ci` est filtré par chemin, un check requis ne s'exécutant pas bloquerait les PR des autres projets.
4. `required_approvals` : 0 par défaut (un mainteneur seul ne peut pas approuver sa propre PR).
5. Valeur de l'attribut `ruleset_enforcement` : démarrer en `evaluate`.

Validation sans secrets (CI) : `tofu fmt -check && tofu init -backend=false && tofu validate`.
