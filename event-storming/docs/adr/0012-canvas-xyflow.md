# ADR-0012 — Canvas : xyflow (React Flow)

- Statut : Accepté · Date : 2026-10-18 · Décideur : utilisateur

## Contexte
Il faut un tableau infini (pan/zoom, sélection, nœuds, liens, groupes) open source. Un Event Storming est un graphe typé : post-its = nœuds, flèches = liens, contextes bornés = groupes.
## Décision
xyflow / React Flow (licence MIT) pour le rendu et l'édition. Il n'est qu'une vue : l'état vit dans le `Y.Doc` (ADR-0013) et la logique dans le domaine. Le rendu « post-it » et les gestes inspirés de Miro sont appliqués par-dessus (ADR-0015).
## Alternatives écartées
tldraw SDK (licence non open source : clé obligatoire en production ou filigrane — conflit avec ADR-0002) ; Konva (tout à construire : sélection, liens, cadres, édition de texte, accessibilité).
## Conséquences
Pas de dessin à main levée ni de formes libres (hors périmètre). Dépendance React côté web.
## Vérification
Règle `domain-no-npm` de `test:arch` (le domaine n'importe pas xyflow) ; revue des dépendances.
