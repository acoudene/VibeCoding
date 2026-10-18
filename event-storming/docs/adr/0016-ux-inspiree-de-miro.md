# ADR-0016 — UX inspirée de Miro

- Statut : Proposé · Date : 2026-10-18 · Décideur : à valider

## Contexte
Le sous-projet 001 a observé le comportement d'un tableau Miro (template Event Storming) avec REA et un script Playwright local (`docs/research/miro-observation.md`). Il faut décider quelles interactions le tableau MVP (sous-projet 002) reproduit, simplifie ou écarte.

## Décision
**Reproduire** (gestes familiers aux utilisateurs de Miro) :
- clic avec l'outil post-it pour poser, texte édité en place, taille de police automatique ;
- 4 points de connexion par post-it ; glisser pour créer un lien fléché qui s'accroche au bord et suit les déplacements ;
- lasso sur zone vide, sélection multiple, `Ctrl+D` (dupliquer dessous), `Ctrl+C` / `Ctrl+V` (coller au pointeur) ;
- `F` + glisser pour créer un cadre ; les post-its contenus suivent le cadre ;
- molette = zoom centré sur le pointeur, Espace + glisser = déplacement, boutons de zoom par paliers, ajuster à l'écran ; vue conservée au rechargement ;
- annuler / rétablir par opération (`Y.UndoManager`).

**Simplifier** :
- on choisit un **type** de post-it, jamais une couleur (palette de 9 types, légende fixe toujours visible) ;
- barres d'outils contextuelles réduites : type, identifiant EN, notes, supprimer ; pour un lien, inverser le sens ;
- un cadre est toujours un **contexte borné** nommé (pas de formats A4, 16:9…).

**Écarter** : couleurs libres, formes libres, dessin, formats (Kanban, Table…), bibliothèque de modèles, réactions, commentaires, présentation, assistant IA intégré (l'assistant de l'outil relève du sous-projet 004).

## Alternatives écartées
Copie fidèle de Miro (16 couleurs, ellipses de regroupement) : la couleur libre et les ellipses ne sont pas exploitables par une dérivation DDD déterministe. UX propre sans référence : perd la familiarité des utilisateurs de Miro.

## Conséquences
La spec 002 reprend la liste « Reproduire » comme critères d'acceptation ; les tests E2E Playwright (ADR-0008) couvrent ces gestes. Le violet reste la *policy* (et non *Business Process* comme dans le template Miro) ; la légende l'indique.

## Vérification
Scénarios E2E du sous-projet 002 alignés sur la liste « Reproduire » ; revue `review-adr-guidelines`.
