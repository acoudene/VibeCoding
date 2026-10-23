# ADR-0018 — L'application web lit le domaine (exception à « presentation n'importe que l'application »)

- Statut : Proposé
- Date : 2026-10-23
- Décideur : utilisateur (choix exprimé en revue de la PR 002, finding M2 ; acceptation via la PR)

## Contexte
`docs/guidelines/architecture-layers.md` (section Presentation) impose que la présentation « n'importe que l'application » et « n'expose jamais d'objet de domaine brut ». Ces règles n'étaient pas vérifiées par `.dependency-cruiser.cjs`, qui n'interdisait à la présentation que l'infrastructure et les racines de composition.

La revue de la PR 002 (finding M2) relève que `src/presentation/web` importe directement le domaine : **38 imports dans 23 fichiers** (inventaire du 2026-10-23, `grep` des imports `domain/` sous `src/presentation`), tous vers `src/domain/board/` :
- types et entité : `Board`, `BoardId`, `BoardFragment`, `Sticky`, `Link`, `Frame`, `Position`, `Rect`, `StickyKind`, `StickyColor` (la majorité en `import type`) ;
- constantes : `STICKY_SIZE`, `STICKY_KINDS` ;
- fonctions pures : `frameOf`, `stickyCenter`, `stickyColor`, `describeExpectedLinks` ;
- erreurs de domaine : `EmptyFrameNameError`, `EmptyBoardNameError` (reconnues pour afficher le message du domaine).

Ce couplage était supposé par le plan 002 (`specs/002-board-mvp/plan.md`, risque « Cadres dans xyflow », l. 69) : l'appartenance d'un post-it à un cadre « reste calculée par le domaine (`frameOf`) », y compris à l'écran pendant un glisser. Le canevas rend directement l'état du tableau, et la grammaire (FR-022), les couleurs dérivées (FR-011) et la géométrie sont des règles métier qu'il ne faut pas dupliquer dans la vue.

`src/presentation/api` (Hono) n'importe pas le domaine.

## Décision
- **Exception limitée à `src/presentation/web`** : l'application web peut importer le domaine **en lecture seule** : types, entité `Board` en tant que donnée lue, objets-valeur, constantes, fonctions pures et erreurs de domaine.
- **Toute modification passe par un cas d'usage** de l'application (`src/application/**`) : la vue n'appelle pas les méthodes de `Board` qui produisent un nouvel état ni ne construit de modification à appliquer.
- **Le reste de la présentation** (aujourd'hui `src/presentation/api`) reste soumis à la règle d'origine : il n'importe pas le domaine.
- **Règles dependency-cruiser** (`.dependency-cruiser.cjs`) :
  - `presentation-domain-only-from-web` : aucun fichier de `src/presentation` hors `src/presentation/web/` n'importe `src/domain` ;
  - `presentation-web-domain-read-only` : `src/presentation/web/` n'importe ni les ports du domaine (`id-generator.ts`, `IdGenerator`) ni la modification élémentaire du tableau (`board-change.ts`, `BoardChange`), unité appliquée au stockage et à l'historique, donc réservée à l'application et à l'infrastructure.

**Limite assumée** : dependency-cruiser vérifie des imports de fichiers, pas des appels de méthode. Il ne peut pas garantir la « lecture seule » : un appel à une méthode de `Board` qui modifie l'état depuis la vue n'est pas détecté. Cette partie de l'exception relève de la **revue de code**. La liste des fichiers interdits de la seconde règle est explicite : tout nouveau port du domaine ou nouveau type de modification doit y être ajouté.

## Alternatives écartées
- **DTO de lecture `BoardView` produit par l'application** : conforme à la guideline, mais refactor lourd (23 fichiers), duplication des types et des fonctions pures (`frameOf`, `stickyColor`, `describeExpectedLinks`) ou réexport mécanique sans valeur ; reporté sans besoin identifié en 002.
- **Laisser en l'état** : écart non documenté entre la guideline et le code, non vérifié par la CI ; tout nouvel import (y compris d'un port ou de `BoardChange`) passerait sans signal.

## Conséquences
- La guideline Presentation mentionne l'exception ; la vue web dépend des noms et formes du domaine `board` : un renommage dans le domaine touche la vue (le compilateur le signale).
- Les règles métier restent en un seul endroit (domaine), la vue les appelle au lieu de les recopier.
- L'API HTTP et toute future présentation hors `web/` restent découplées du domaine, vérifiées par la CI.
- Si un besoin de découplage apparaît (autre client, collaboration du sous-projet 005), cet ADR sera remplacé par un ADR introduisant un modèle de lecture applicatif.

## Vérification
`npm run test:arch` (règles `presentation-domain-only-from-web` et `presentation-web-domain-read-only`) ; tests `tests/unit/architecture/dependency-rules.test.ts` (cas positif : la vue web lit un objet-valeur et une fonction pure ; cas négatifs : l'API importe le domaine, la vue importe un port ou `BoardChange`) ; revue de code pour la lecture seule (aucune méthode de `Board` qui modifie l'état appelée depuis `src/presentation/web`).
