# ADR-0015 — Observation de Miro avec REA

- Statut : Accepté · Date : 2026-10-18 · Décideur : utilisateur

## Contexte
L'UX doit s'inspirer de Miro sans en reprendre le code.
## Décision
Observation **runtime** d'un tableau Miro **de test appartenant à l'utilisateur**, au cours d'un scénario déclaré, pilotée par l'agent (REA `capture_browser_scenario` ; extension Claude in Chrome optionnelle pour l'exploration). Exclus : analyse ou extraction du code de Miro, tout autre tableau, le compte et les partages. L'utilisateur se connecte lui-même ; l'agent ne saisit jamais d'identifiants. Données personnelles et jetons expurgés avant tout commit. Livrables : `docs/research/miro-observation.md` (observé / déduit / inconnu, avec ID de preuve) et un ADR « UX inspirée de Miro ». Si REA est injoignable, rapport marqué « partiel » fondé sur la documentation publique.
## Alternatives écartées
Analyse du bundle JavaScript de Miro (contraire à leurs conditions d'utilisation, inutile pour le produit) ; aucune observation (moins fidèle).
## Conséquences
Le sous-projet 001 ne bloque pas le 002.
## Vérification
Revue du rapport avant commit (expurgation, périmètre).
