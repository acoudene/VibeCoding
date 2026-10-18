# ADR-0002 — Technologies gratuites ou open source

- Statut : Accepté · Date : 2026-10-18 · Décideur : utilisateur

## Contexte
Projet de l'AI factory sans budget.
## Décision
Toute dépendance, service ou hébergement doit être open source **ou** disposer d'un tier gratuit pérenne sans carte bancaire obligatoire. Vérifier la licence avant d'ajouter une dépendance. Exception encadrée : un adaptateur LLM payant (Claude) peut exister **en option**, jamais requis pour utiliser l'outil ni pour la CI (ADR-0006, ADR-0011).
## Alternatives écartées
Services payants ; SDK de canvas sous licence propriétaire (tldraw, ADR-0012).
## Conséquences
Quotas à respecter (Cloudflare, tier LLM gratuit). Dépendance ajoutée ⇒ licence indiquée dans la PR.
## Vérification
`review-adr-guidelines` contrôle `package.json` et la config d'hébergement.
