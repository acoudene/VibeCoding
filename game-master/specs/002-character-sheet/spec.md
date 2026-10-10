# Spec 002 — Fiche de personnage minimale

- Statut : Validée (porte 1, 2026-10-10) ; point SRD tranché par délégation : règle maison (ADR-0015, `Proposé`, accepté par la fusion de la PR)
- Contextes bornés : Characters (nouveau), Play, Game Master
- Référence SRD : 5.1 — caractéristiques (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma) et modificateurs ; méthode de génération des valeurs à confirmer (voir Q1)
- Décisions amont : `docs/00-vision.md` (v1 = fiche à 6 caractéristiques, test de caractéristique, PV ; joueurs = pseudo sans compte)

## Problème et valeur
La spec 001 teste une caractéristique par défaut (10). Chaque joueur doit avoir un personnage dont les caractéristiques déterminent ses tests, pour que le Game Master arbitre selon le personnage réel.

## Récits utilisateur
- US-1 : en tant que joueur d'une partie, je crée mon personnage (nom + 6 caractéristiques) pour jouer.
- US-2 : en tant que joueur, quand mon action exige un test, c'est la caractéristique pertinente de **mon** personnage qui est utilisée.

## Exigences fonctionnelles
- FR-001 : un personnage appartient à un joueur d'une partie et a un nom non vide.
- FR-002 : un personnage a exactement 6 caractéristiques SRD (STR, DEX, CON, INT, WIS, CHA), obtenues en répartissant le tableau standard 15, 14, 13, 12, 10, 8 (chaque valeur utilisée une fois). Toute autre répartition est rejetée.
- FR-003 : un joueur a au plus un personnage par partie.
- FR-004 : l'arbitre indique, pour un test requis, **quelle caractéristique** est testée en plus du DD ; toute valeur hors des 6 est rejetée (ACL).
- FR-005 : le test utilise le modificateur de la caractéristique indiquée du personnage du joueur ; un joueur sans personnage ne peut pas jouer de tour.
- FR-006 : `POST /sessions/:id/characters` → 201 / 400 / 403 (joueur hors partie) / 404 / 409 ; `POST /sessions/:id/turns` → 201 / 400 / 403 / 404 / 409 (personnage requis) / 502 (réponse invalide de l'arbitre).

## Hors périmètre
Points de vie (voir Q2), classes, niveaux, compétences, équipement, combat, persistance D1, front.

## Termes du langage ubiquitaire (nouveaux)
Personnage (`Character`), Caractéristique (`Ability`), Fiche de personnage.

## Scénarios BDD
`tests/bdd/features/character-sheet.feature` (+ `ability-check-turn.feature` mis à jour).

## Décisions de clarification (utilisateur, 2026-10-10)
- Q1 : tableau standard SRD 15,14,13,12,10,8 à répartir (existence dans le SRD 5.1 **à vérifier** dans le texte officiel avant release).
- Q2 : PV reportés à une spec ultérieure (avec classes).
- Q3 : l'arbitre LLM propose la caractéristique, le domaine valide.
- Q4 : au plus un personnage par joueur et par partie.

## Limites connues (documentées par la revue, non traitées ici)
- **Identité** : le `playerId` vient du corps de la requête, sans authentification (décision v1 : pseudo sans compte). N'exposer l'API hors local qu'après une spec d'identité.
- **Injection de prompt** : le texte libre du joueur influence l'arbitre (y compris la caractéristique testée). À traiter par une spec dédiée (délimitation de l'entrée, bornes côté domaine, journal des décisions).

## Décision SRD (déléguée par l'utilisateur)
Le tableau standard n'a pas pu être vérifié dans le SRD 5.1. Il est conservé comme **règle maison** (ADR-0015). Alternative 100 % SRD si l'utilisateur la préfère : saisie libre 1..30.
