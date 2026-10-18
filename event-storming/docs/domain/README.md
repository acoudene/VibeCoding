# Modèle DDD — **Accepté** (spec validée le 2026-10-18)

Dérivé de la spec de design (`docs/superpowers/specs/2026-10-18-event-storming-design.md`). Tout élément marqué ❓ est une question ouverte, pas un fait. Ce document a le format cible de l'export Markdown du générateur (ADR-0014).

## Sous-domaines et contextes bornés
| Contexte | Type | Responsabilité | Implémenté |
|---|---|---|---|
| **Board** (Atelier) | Cœur | Tableau, post-its typés, liens, cadres ; grammaire Event Storming | Partiel (`StickyKind`, `stickyColor`) ; agrégat complet en spec 002 |
| **Modeling** (Modélisation) | Support | Dérivation déterministe d'un modèle DDD depuis un instantané ; anomalies ; export | Non (sous-projet 003) |

## Context map
```
Board ──(ACL : BoardSnapshot en lecture seule)──▶ Modeling
Modeling ──(ACL)──▶ LLM externe (Ollama / tier gratuit / Claude optionnel) via LlmPort
```
- **Board → Modeling** : *Anti-Corruption Layer*. Modeling ne connaît du tableau qu'un instantané immuable.
- **Modeling → LLM** : la sortie du LLM est non fiable, validée par schéma. Le LLM **propose** des suggestions ; une suggestion acceptée devient une mutation du **tableau**, jamais du modèle.

## Agrégats
- **Board** (racine, contexte Board) — identifié par un `BoardId`, nommé par un `BoardName` ; contient des `Sticky`, des `Link` et des `Frame`. Immuable : chaque opération métier renvoie le nouveau tableau **et** la liste des `BoardChange` appliquées (spec 002). Invariants :
  - le **type** d'un post-it détermine sa couleur ; la couleur n'est jamais une donnée saisie ;
  - tous les post-its ont la même taille fixe (spec 002, FR-017) ;
  - un `Link` référence deux post-its existants du même tableau ; pas de boucle sur soi-même (refusée : `SelfLinkError`) ;
  - un lien hors grammaire est **accepté** mais marqué `outOfGrammar` (anomalie) — on ne bloque jamais l'atelier. `outOfGrammar` est **dérivé** des types des deux extrémités, jamais stocké : changer le type d'un post-it requalifie ses liens ;
  - supprimer un post-it supprime ses liens ; supprimer un cadre ne supprime pas ses post-its ;
  - un post-it appartient au cadre qui contient son centre ; déplacer un cadre déplace les post-its qui lui appartiennent au début du déplacement.
  - cadres qui se chevauchent : un post-it dont le centre est dans plusieurs cadres appartient au **plus petit** (décision utilisateur, spec 002).
- Grammaire « design level » des liens autorisés :
  - `Actor → Command`, `Command → Aggregate`, `Aggregate → DomainEvent`
  - `DomainEvent → Policy`, `Policy → Command`
  - `DomainEvent → ReadModel`, `ReadModel → Actor`
  - `ExternalSystem → DomainEvent`, `Command → ExternalSystem`
  - `Rule → Aggregate` (attache d'invariant)

## Objets-valeur et services de domaine
- `Sticky` (`id`, `kind`, `label` FR, `identifier` EN optionnel, `position`, `notes`), `Link` (`id`, `sourceId`, `targetId` ; `outOfGrammar` dérivé), `Frame` (`id`, `name`, rectangle).
- `BoardId` (identifiant non devinable), `BoardName` (texte non vide après suppression des espaces ; défaut « Tableau sans titre »), `Position` (`x`, `y`), `Rect` (`x`, `y`, `width`, `height` > 0).
- `BoardFragment` : fragment copié — post-its (type, texte, identifiant, notes, position relative au centre de la boîte englobante) et liens internes à la sélection ; collé par `paste(fragment, at)` avec de nouveaux identifiants.
- `BoardChange` : modification élémentaire du tableau (`StickyAdded`, `StickyUpdated`, `StickyRemoved`, `LinkAdded`, `LinkReversed`, `LinkRemoved`, `FrameAdded`, `FrameUpdated`, `FrameRemoved`, `BoardRenamed`). C'est l'unité appliquée au stockage et à l'historique (annuler/rétablir).
- Services (Board) : `classifyLink(source, target): "inGrammar" | "outOfGrammar"`, `frameOf(sticky, frames)`, `nextFrameName(frames)` (« Contexte N », N = nombre de cadres + 1).
- `StickyKind`, `StickyColor` (implémentés).
- `BoardSnapshot` (copie immuable du tableau), `DomainModel` (`schemaVersion`, `boundedContexts`, `contextMap`, `ubiquitousLanguage`, `anomalies`), `Anomaly`.
- Service (Modeling) : `deriveDomainModel(boardSnapshot): DomainModel` — pur et déterministe.
- Ports : `IdGenerator` (domaine) ; `BoardStore` (état d'un tableau ouvert, applique des `BoardChange`), `BoardHistory` (annuler/rétablir), `RecentBoards` (tableaux ouverts dans ce navigateur) — application, spec 002 ; `LlmPort` (004).

## Langage ubiquitaire
| Terme (FR) | Identifiant (EN) | Définition |
|---|---|---|
| Tableau | `Board` | Espace d'un atelier Event Storming |
| Post-it | `Sticky` | Élément typé posé sur le tableau |
| Type de post-it | `StickyKind` | Événement, commande, acteur, agrégat, policy, read model, système externe, hotspot, règle |
| Couleur de post-it | `StickyColor` | Dérivée du type : orange (événement), bleu (commande), jaune pâle (acteur), jaune (agrégat), violet (policy), vert (read model), rose (système externe), rouge (hotspot), gris (règle) |
| Nom du tableau | `BoardName` | Nom affiché du tableau ; « Tableau sans titre » par défaut |
| Modification du tableau | `BoardChange` | Opération élémentaire appliquée au tableau ; unité d'enregistrement et d'annulation |
| Lien hors grammaire | `Link.outOfGrammar` | Lien accepté mais non conforme à la grammaire « design level » ; dérivé des types |
| Appartenance à un cadre | `frameOf` | Un post-it appartient au cadre qui contient son centre |
| Type actif | `activeKind` | Type choisi dans la palette, appliqué au prochain post-it posé (interface) |
| Tableaux récents | `RecentBoards` | Tableaux déjà ouverts dans ce navigateur (nom, dernière ouverture) |
| Lien | `Link` | Relation orientée entre deux post-its |
| Cadre | `Frame` | Zone délimitant un contexte borné |
| Fragment copié | `BoardFragment` | Post-its et liens internes copiés, prêts à être collés ailleurs sur le tableau |
| Instantané | `BoardSnapshot` | Copie immuable du tableau à un instant donné |
| Modèle de domaine | `DomainModel` | Résultat DDD dérivé d'un instantané |
| Anomalie | `Anomaly` | Incohérence détectée, rattachée à des post-its |
| Suggestion | `Suggestion` | Proposition de l'assistant, transformable en mutation du tableau |

## Questions ouvertes
- ❓ Niveaux « big picture » et « process level » : supportés visuellement, seul le « design level » alimente la génération — à confirmer après le sous-projet 001.
