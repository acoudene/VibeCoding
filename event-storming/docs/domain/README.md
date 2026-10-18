# Modèle DDD — **Accepté** (spec validée le 2026-10-18)

Dérivé de la spec de design (`docs/superpowers/specs/2026-10-18-event-storming-design.md`). Tout élément marqué ❓ est une question ouverte, pas un fait. Ce document a le format cible de l'export Markdown du générateur (ADR-0014).

## Sous-domaines et contextes bornés
| Contexte | Type | Responsabilité | Implémenté |
|---|---|---|---|
| **Board** (Atelier) | Cœur | Tableau, post-its typés, liens, cadres ; grammaire Event Storming | Partiel (`StickyKind`, `stickyColor`) |
| **Modeling** (Modélisation) | Support | Dérivation déterministe d'un modèle DDD depuis un instantané ; anomalies ; export | Non (sous-projet 003) |

## Context map
```
Board ──(ACL : BoardSnapshot en lecture seule)──▶ Modeling
Modeling ──(ACL)──▶ LLM externe (Ollama / tier gratuit / Claude optionnel) via LlmPort
```
- **Board → Modeling** : *Anti-Corruption Layer*. Modeling ne connaît du tableau qu'un instantané immuable.
- **Modeling → LLM** : la sortie du LLM est non fiable, validée par schéma. Le LLM **propose** des suggestions ; une suggestion acceptée devient une mutation du **tableau**, jamais du modèle.

## Agrégats
- **Board** (racine, contexte Board) — contient des `Sticky`, des `Link` et des `Frame`. Invariants :
  - le **type** d'un post-it détermine sa couleur ; la couleur n'est jamais une donnée saisie ;
  - un `Link` référence deux post-its existants du même tableau ; pas de boucle sur soi-même ;
  - un lien hors grammaire est **accepté** mais marqué `outOfGrammar` (anomalie) — on ne bloque jamais l'atelier ;
  - un post-it appartient au cadre qui contient son centre.
- Grammaire « design level » des liens autorisés :
  - `Actor → Command`, `Command → Aggregate`, `Aggregate → DomainEvent`
  - `DomainEvent → Policy`, `Policy → Command`
  - `DomainEvent → ReadModel`, `ReadModel → Actor`
  - `ExternalSystem → DomainEvent`, `Command → ExternalSystem`
  - `Rule → Aggregate` (attache d'invariant)

## Objets-valeur et services de domaine
- `Sticky` (`id`, `kind`, `label` FR, `identifier` EN optionnel, `position`, `notes`), `Link` (`sourceId`, `targetId`, `outOfGrammar`), `Frame` (`name`, rectangle).
- `StickyKind`, `StickyColor` (implémentés).
- `BoardSnapshot` (copie immuable du tableau), `DomainModel` (`schemaVersion`, `boundedContexts`, `contextMap`, `ubiquitousLanguage`, `anomalies`), `Anomaly`.
- Service (Modeling) : `deriveDomainModel(boardSnapshot): DomainModel` — pur et déterministe.
- Ports : `BoardRepository`, `LlmPort` (sous-projets 002, 004).

## Langage ubiquitaire
| Terme (FR) | Identifiant (EN) | Définition |
|---|---|---|
| Tableau | `Board` | Espace d'un atelier Event Storming |
| Post-it | `Sticky` | Élément typé posé sur le tableau |
| Type de post-it | `StickyKind` | Événement, commande, acteur, agrégat, policy, read model, système externe, hotspot, règle |
| Couleur de post-it | `StickyColor` | Dérivée du type : orange (événement), bleu (commande), jaune pâle (acteur), jaune (agrégat), violet (policy), vert (read model), rose (système externe), rouge (hotspot), gris (règle ❓) |
| Lien | `Link` | Relation orientée entre deux post-its |
| Cadre | `Frame` | Zone délimitant un contexte borné |
| Instantané | `BoardSnapshot` | Copie immuable du tableau à un instant donné |
| Modèle de domaine | `DomainModel` | Résultat DDD dérivé d'un instantané |
| Anomalie | `Anomaly` | Incohérence détectée, rattachée à des post-its |
| Suggestion | `Suggestion` | Proposition de l'assistant, transformable en mutation du tableau |

## Questions ouvertes
- ❓ Couleur du post-it `Rule` (provisoire : gris).
- ❓ Niveaux « big picture » et « process level » : supportés visuellement, seul le « design level » alimente la génération — à confirmer après le sous-projet 001.
