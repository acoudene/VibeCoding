# ADR-0014 — Contrat d'export `domain-model.json`

- Statut : Accepté · Date : 2026-10-18 · Décideur : utilisateur

## Contexte
Le modèle DDD exporté est le pivot du produit et le contrat avec l'AI factory.
## Décision
`domain-model.json` est la sortie de référence : JSON Schema généré depuis Zod, champ `schemaVersion` en semver (changement incompatible = version majeure). Export Markdown complémentaire au format de `game-master/docs/domain/README.md` (contextes, context map, agrégats + invariants, objets-valeur, langage ubiquitaire FR/EN, ❓ pour les points non résolus). Le workflow `feature` accepte un `domain-model.json` en entrée.
## Alternatives écartées
Markdown seul (non lisible de façon fiable par machine) ; format sans version.
## Conséquences
Toute évolution du schéma passe par une version et la mise à jour des golden files (ADR-0008).
## Vérification
Tests de propriétés (conformité au schéma) et golden files.
