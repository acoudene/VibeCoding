# Event Storming — design (spec)

- **Date** : 2026-10-18
- **Statut** : Proposé — à valider par l'utilisateur
- **Auteur** : Anthony COUDENE (avec Claude Code)

## 1. Intention

Construire un outil de tableau blanc **spécialisé Event Storming**, dont l'UX s'inspire de Miro (comportement observé avec REA), et qui **génère un modèle DDD** à la fin d'un atelier.

Trois usages, simultanés :

1. **Outil d'atelier** réel (perso / équipe).
2. **Brique de l'AI factory** : le modèle DDD exporté est un contrat lisible par machine, consommé par le workflow `feature`.
3. **Démo vibe coding** : un « mini-Miro » spécialisé, soigné.

Le **modèle DDD exporté est le pivot** du produit.

### Critères de succès

- Un atelier « design level » peut être conduit de bout en bout (post-its typés, liens, cadres de contexte) sans quitter l'outil.
- `deriveDomainModel` est **déterministe** : même instantané ⇒ même modèle, octet pour octet.
- Un tableau de référence reproduisant le domaine de `game-master` régénère un équivalent de `game-master/docs/domain/README.md`.
- `domain-model.json` est validé par un JSON Schema versionné et accepté en entrée par le workflow `feature` du projet.

## 2. Décisions prises pendant le brainstorming

| Sujet | Décision |
|---|---|
| Collaboration | Mono-utilisateur d'abord, **architecture CRDT (Yjs) dès le départ** ; synchro réseau plus tard |
| Génération DDD | **Hybride** : règles déterministes (cœur) + assistant LLM optionnel (suggestions acceptées/refusées) |
| Cadre technique | **2ᵉ projet de l'AI factory** : contraintes de `game-master` (ADR-0002 gratuit/OSS, TS + Hono + Cloudflare, hexagonal + DDD, TDD, Spec Kit, docs FR / code EN, LLM derrière un port) |
| Emplacement | Nouveau dossier **`event-storming/` autonome, avec sa propre AI factory** copiée du socle `game-master` (branche `feat/002-character-sheet`, commit `7542b25`). Aucune dépendance vers `game-master`. Extraction future dans `ai-factory/` = décision séparée (ADR) |
| Observation Miro | **REA, observation runtime dans le navigateur** sur un board appartenant à l'utilisateur ; aucune analyse du code de Miro |
| Pilotage du navigateur | Claude pilote Chrome : REA `capture_browser_scenario` (principal), extension Claude in Chrome (exploration, optionnel). L'utilisateur se connecte lui-même à Miro |
| Moteur de canvas | **xyflow / React Flow (MIT)**. tldraw écarté (licence non OSS, conflit ADR-0002) ; Konva écarté (coût d'implémentation) |

## 3. Découpage en sous-projets

Chaque sous-projet suit son propre cycle Spec Kit (`specs/NNN-*`).

| # | Sous-projet | Livrable | Dépend de |
|---|---|---|---|
| 000 | Bootstrap | `event-storming/` + factory copiée/adaptée (agents, workflows, guidelines, sync, `npm run verify`), vision, ADR fondateurs (stack, xyflow, Yjs, contrat d'export, REA) | — |
| 001 | Observation Miro (REA) | Rapport observé/déduit/inconnu + ADR « UX inspirée de Miro ». Pas de code produit | 000 |
| 002 | Board MVP mono-utilisateur | Canvas xyflow, post-its typés, liens, cadres, état Yjs, persistance Durable Object | 000 (001 recommandé) |
| 003 | Générateur DDD déterministe | `deriveDomainModel` + exports JSON / Markdown | 002 (domaine) |
| 004 | Assistant IA | Suggestions via `LlmPort` (Ollama / tier gratuit / Claude optionnel) | 003 |
| 005 | Temps réel | Synchro Yjs WebSocket via Durable Objects, présence/curseurs, identité (ADR) | 002 |

Le sous-projet 001 n'est **pas bloquant** pour 002 : si REA reste injoignable, le rapport est marqué partiel.

## 4. Domaine

### 4.1 Contexte **Board (Atelier)** — cœur

Agrégat **`Board`** (racine) contenant :

- **`Sticky`** : `id`, `kind`, `label` (FR, texte affiché), `identifier` (EN, saisi, optionnel), `position`, `notes`.
  `kind` ∈ `DomainEvent` (orange), `Command` (bleu), `Actor` (jaune pâle), `Aggregate` (jaune), `Policy` (violet), `ReadModel` (vert), `ExternalSystem` (rose), `Hotspot` (rouge), `Rule` (note d'invariant attachée).
- **`Link`** : orienté, `sourceId` → `targetId`, avec un indicateur `outOfGrammar`.
- **`Frame`** : cadre de contexte borné, `name`, rectangle ; un post-it appartient au cadre qui contient son centre.

Invariants :

- Le **type** d'un post-it détermine sa couleur ; la couleur n'est jamais une donnée saisie.
- Un `Link` référence deux post-its existants du même board ; pas de boucle sur soi-même.
- Grammaire « design level » des liens **autorisés** :
  - `Actor → Command`, `Command → Aggregate`, `Aggregate → DomainEvent`
  - `DomainEvent → Policy`, `Policy → Command`
  - `DomainEvent → ReadModel`, `ReadModel → Actor`
  - `ExternalSystem → DomainEvent`, `Command → ExternalSystem`
  - `Rule → Aggregate` (attache d'invariant)
- Un lien **hors grammaire est accepté** mais marqué `outOfGrammar` (devient une anomalie) — on ne bloque jamais l'atelier.

### 4.2 Contexte **Modeling (Modélisation)** — support

Service pur **`deriveDomainModel(boardSnapshot): DomainModel`**. Ne connaît du Board qu'un **instantané en lecture seule** (ACL).

`DomainModel` : `schemaVersion`, `boundedContexts[]` (agrégats, commandes, événements, policies, read models, acteurs, systèmes externes), `contextMap[]`, `ubiquitousLanguage[]`, `anomalies[]`.

### 4.3 Langage ubiquitaire de l'outil

| Terme (FR) | Identifiant (EN) | Définition |
|---|---|---|
| Tableau | `Board` | Espace d'un atelier Event Storming |
| Post-it | `Sticky` | Élément typé posé sur le tableau |
| Lien | `Link` | Relation orientée entre deux post-its |
| Cadre | `Frame` | Zone délimitant un contexte borné |
| Instantané | `BoardSnapshot` | Copie immuable du tableau à un instant donné |
| Modèle de domaine | `DomainModel` | Résultat DDD dérivé d'un instantané |
| Anomalie | `Anomaly` | Incohérence détectée, rattachée à des post-its |
| Suggestion | `Suggestion` | Proposition de l'assistant, transformable en mutation du tableau |

## 5. Architecture

```
event-storming/
├─ src/
│  ├─ domain/           board/ (Board, Sticky, Link, Frame, grammaire)
│  │                    modeling/ (deriveDomainModel, DomainModel, anomalies)
│  ├─ application/      use cases : AddSticky, LinkStickies, GenerateDomainModel,
│  │                    ExportDomainModel, SuggestImprovements ; ports
│  ├─ infrastructure/   YjsBoardStore, DurableObjectBoardRepository,
│  │                    adaptateurs LlmPort (Ollama / tier gratuit / Claude), exporters
│  └─ presentation/     api/ (Hono sur Workers) · web/ (React + xyflow sur Pages)
├─ factory/  docs/  specs/  infra/  tests/
```

- **Source de vérité de l'état** : un `Y.Doc` par tableau. L'adaptateur `BoardStore` mappe `Y.Doc ⇄ Board`. Le domaine ne connaît ni Yjs, ni xyflow, ni Hono.
- **Domaine partagé client/serveur** : TypeScript pur. Côté client pour le feedback instantané (couleur, liens hors grammaire, aperçu DDD) ; côté serveur pour la génération et l'export qui font foi.
- **Persistance** : un Durable Object par tableau stocke l'état Yjs binaire. Au MVP, le client pousse ses mises à jour en différé (HTTP, sans WebSocket). D1 stocke la liste des tableaux et leurs métadonnées.
- **Dépendances** : `presentation → application → domain`, `infrastructure → application/domain`, vérifiées par `npm run verify`.
- **LLM** : derrière `LlmPort`. Sortie non fiable, validée par schéma. Le LLM **ne modifie jamais** le modèle : il propose.
- **Accès MVP** : pas d'authentification ; un tableau est accessible par une URL non devinable. L'identité arrive avec le sous-projet 005 (ADR).

## 6. Génération DDD et export

### 6.1 Pipeline déterministe

1. **Contextes** : chaque `Frame` → contexte borné. Post-its hors cadre → contexte `Unassigned` + anomalie.
2. **Agrégats** : chaque `Aggregate` → agrégat. Commandes = `Command` pointant vers lui ; événements = `DomainEvent` vers lesquels il pointe ; invariants = `Rule` attachées.
3. **Policies** : `DomainEvent → Policy → Command` = règle « quand X, alors Y ». Si la chaîne traverse deux cadres → relation de **context map** (type `toBeDefined` par défaut).
4. **Read models, acteurs, systèmes externes** : repris avec leurs liens.
5. **Langage ubiquitaire** : `label` (FR) et `identifier` (EN) collectés tels quels. **Aucune traduction automatique** ; identifiant manquant → anomalie `missingIdentifier`.
6. **Anomalies** : `orphanEvent`, `commandWithoutAggregate`, `aggregateWithoutEvent`, `duplicateName`, `outOfGrammarLink`, `openHotspot`, `unassignedSticky`, `missingIdentifier`. Chacune référence les `id` des post-its concernés.

**Ordre** : chronologie selon l'axe horizontal ; tri stable (`x`, puis `y`, puis `id`) pour garantir le déterminisme.

### 6.2 Exports

- **`domain-model.json`** — sortie de référence. JSON Schema généré depuis Zod, **versionné** (`schemaVersion`, semver). C'est le contrat avec l'AI factory.
- **`domain/README.md`** — rendu au format de `game-master/docs/domain/README.md` : contextes (tableau), context map, agrégats + invariants, objets-valeur, langage ubiquitaire FR/EN. Points non résolus (anomalies, hotspots) marqués ❓.
- **Intégration factory** : le workflow `feature` d'`event-storming` accepte un `domain-model.json` en entrée.

### 6.3 Assistant (sous-projet 004)

Entrée : instantané + modèle déterministe. Sortie : suggestions typées `rename`, `missingEvent`, `invariantCandidate`, `contextSplit`, `hotspot`, validées par schéma. Une suggestion acceptée devient une **mutation du tableau** (jamais du modèle) : le tableau reste l'unique source de vérité.

## 7. Observation de Miro avec REA (sous-projet 001)

**Périmètre** : observation du **comportement** d'un tableau Miro **de test, appartenant à l'utilisateur**, au cours d'un scénario déclaré. Exclus : analyse ou extraction du code de Miro, tout autre tableau, le compte et les partages de l'utilisateur.

**Préparation**

1. Diagnostic de la connexion REA (`npx -y rea-agents@6.7.0 doctor --client claude_code --json`). Si la configuration doit être corrigée : plan `setup --dry-run` présenté et approuvé avant toute écriture.
2. Optionnel : extension Claude in Chrome activée (`/chrome`) pour l'exploration.
3. L'utilisateur se connecte lui-même à Miro et fournit l'URL du tableau de test. Claude ne saisit jamais d'identifiants.

**Scénario** (`capture_browser_scenario`, en captures courtes, piloté par Claude) :

- créer un post-it, changer sa couleur/type, éditer son texte ;
- déplacer, sélection multiple, alignement ;
- relier deux post-its, déplacer une extrémité ;
- créer un cadre, y glisser des post-its ;
- zoom/pan (molette, pavé, raccourcis), minimap ;
- annuler/rétablir, copier/coller.

**Livrables**

- `docs/research/miro-observation.md` : pour chaque interaction, observé (ID de preuve REA) / déduit / inconnu.
- Inventaire priorisé : MVP / plus tard / hors périmètre.
- ADR « UX inspirée de Miro ».
- Données personnelles et jetons **expurgés** avant tout commit.

**Repli** : si REA reste injoignable, rapport marqué « partiel », inventaire fondé sur la documentation publique (chaque élément marqué comme tel).

## 8. Tests et qualité

TDD : test rouge d'abord. Pas de LLM réel en CI (reprise d'ADR-0014).

| Niveau | Outil | Portée |
|---|---|---|
| Unitaire domaine | Vitest + fast-check | Invariants `Board`, grammaire, chaque règle et anomalie. Propriétés : déterminisme, indépendance à l'ordre d'insertion, conformité au JSON Schema |
| Golden files | Vitest | `tests/fixtures/boards/*.json` → `domain-model.json` + `README.md` attendus ; dont un tableau reproduisant le domaine `game-master` |
| BDD | Cucumber (FR) | Scénarios métier de génération |
| Infrastructure | Vitest + Miniflare | Mapping `Board ⇄ Y.Doc`, persistance Durable Object, sérialiseurs |
| Adaptateurs LLM | Vitest + faux `LlmPort` | Validation par schéma, rejet des sorties invalides |
| E2E | Playwright | Créer → relier → encadrer → générer → exporter ; interactions retenues par l'ADR UX |
| Architecture | `npm run verify` | Sens des dépendances ; le domaine n'importe ni Yjs, ni xyflow, ni Hono |

`npm run verify` vert avant toute PR.

## 9. Hors périmètre (MVP)

Dessin à main levée, formes libres, images, commentaires, votes par points, minuteur d'atelier, import Miro, authentification, temps réel (→ 005).

## 10. Questions ouvertes

- ❓ Nom définitif du produit (provisoire : `event-storming`).
- ❓ Niveaux « big picture » et « process level » : supportés visuellement dès 002, mais seul le « design level » alimente la génération DDD — à confirmer après 001.
