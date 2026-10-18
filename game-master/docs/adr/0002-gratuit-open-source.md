# ADR-0002 — Technologies gratuites ou open source

- Statut : Accepté · Date : 2026-10-10 · Décideur : utilisateur

## Contexte
Projet pilote sans budget.
## Décision
Toute dépendance, service ou hébergement doit être open source **ou** disposer d'un tier gratuit pérenne sans carte bancaire obligatoire. Vérifier la licence avant d'ajouter une dépendance.
## Alternatives écartées
Services payants (Azure, API LLM payantes).
## Conséquences
Quotas à respecter (Cloudflare, tier LLM gratuit) ; pas de LLM payant en CI (ADR-0014). Dépendance ajoutée ⇒ licence indiquée dans la PR.
## Vérification
`review-adr-guidelines` contrôle `package.json` et la config d'hébergement.
