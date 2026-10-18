# ADR-0001 — Consigner les décisions d'architecture

- Statut : Proposé · Date : 2026-10-18 · Décideur : à valider

## Contexte
Les agents IA n'ont pas de mémoire entre sessions ; les décisions doivent être lisibles et vérifiables.
## Décision
Un ADR (format `0000-template.md`) par décision structurante, en PR. Les agents lisent `docs/adr/` avant de planifier et n'enfreignent jamais un ADR `Accepté` ; ils en proposent un nouveau (statut `Proposé`) pour le changer.
## Alternatives écartées
Décisions dans les specs seules (dispersées) ; wiki externe (hors dépôt).
## Conséquences
Historique versionné. Charge de rédaction faible.
## Vérification
Agent `review-adr-guidelines`.
