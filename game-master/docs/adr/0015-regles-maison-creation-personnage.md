# ADR-0015 — Règles maison de création de personnage (amende ADR-0008)

- Statut : Proposé (accepté par la fusion de la PR 002 par l'utilisateur) · Date : 2026-10-10 · Décideur : utilisateur (délégation « tranche au mieux »)

## Contexte
ADR-0008 interdit tout contenu hors SRD 5.1. La spec 002 impose le tableau standard (15, 14, 13, 12, 10, 8) choisi par l'utilisateur, mais sa présence dans le SRD 5.1 n'a pas pu être vérifiée (source inaccessible) ; la revue pense qu'il vient du Player's Handbook.
## Décision
La **méthode de génération des caractéristiques** est une *règle maison* explicitement étiquetée, autorisée en exception d'ADR-0008 : tableau standard 15, 14, 13, 12, 10, 8 réparti une fois chacune. Tout le reste (valeurs 1..30, modificateur `floor((v-10)/2)`, test d20 + modificateur ≥ DD) reste SRD 5.1. Toute autre règle maison exige un ADR dédié ; le code l'identifie par un commentaire `règle maison (ADR-0015)`.
Si l'utilisateur préfère rester 100 % SRD : remplacer par une saisie libre 1..30 (suppression de `STANDARD_ARRAY` et de la validation de répartition) et rejeter cet ADR.
## Alternatives écartées
Saisie libre 1..30 (conforme mais déséquilibrée) ; tirage 4d6 (même incertitude SRD, ajoute de l'aléa).
## Conséquences
La licence CC-BY-4.0 ne couvre pas cette règle : aucune attribution SRD à lui associer. Vérifier ultérieurement le texte du SRD ; si le tableau y figure, cet ADR devient sans objet.
## Vérification
`review-adr-guidelines` : règle maison sans ADR ⇒ bloquant.
