# Spec 001 — Tour de jeu avec test de caractéristique

- Statut : Brouillon (réalisée rétroactivement pour le socle ; à valider). FR-002/FR-003 amendés par la spec 002 (caractéristique proposée par l'arbitre, personnage requis).
- Contextes bornés : Play, Game Master, Rules
- Référence SRD : 5.1, « Ability Checks » (d20 + modificateur ≥ DD) — section exacte à confirmer

## Problème et valeur
Un joueur décrit une action ; le Game Master IA décide si un test est nécessaire, les règles le résolvent, le narrateur raconte.

## Exigences fonctionnelles
- FR-001 : un joueur d'une partie soumet une action libre non vide.
- FR-002 : l'arbitre renvoie « pas de test » ou un DD (5..30), validé ; toute autre sortie est rejetée.
- FR-003 : si test, résultat = d20 + modificateur ≥ DD (domaine, dé injecté).
- FR-004 : le narrateur reçoit le résultat déjà décidé et produit la narration.
- FR-005 : le tour est enregistré, numéroté séquentiellement.
- FR-006 : API `POST /sessions/:id/turns` → 201 / 400 / 404.

## Hors périmètre
Fiches de personnage (traitées par la spec 002), avantage/désavantage, combat, WebSocket, persistance D1, front.

## Scénarios BDD
`tests/bdd/features/ability-check-turn.feature`

## À clarifier
- Où vit la caractéristique du joueur (contexte Characters) ? Comment choisir la caractéristique testée ?
- Que faire si l'arbitre renvoie une sortie invalide (réessai, repli) ?
