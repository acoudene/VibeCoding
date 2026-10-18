# Tâches 002 — Tableau MVP mono-utilisateur

Format : `- [ ] T001 [P?] [couche] description (fichier)` — `[P]` = parallélisable. Ordre : tests rouges avant implémentation. Un scénario BDD perd son tag `@wip` dans la tâche qui l'implémente ; `npm run verify` vert à la fin de chaque couche.

## Outillage
- [x] T001 [outillage] Dépendances (plan, « Contrats externes »), `tsconfig.web.json` (DOM, JSX), `vite.config.ts`, `index.html`, `wrangler.toml` (Durable Object `BOARD`), scripts `dev`, `build`, `test:e2e`, `test:workers` ; `verify` inchangé + `test:workers` (`package.json`)
- [x] T002 [outillage] Racines `src/main.*` autorisées par `.dependency-cruiser.cjs` ; fixture d'architecture : la présentation ne peut pas importer `src/infrastructure` (`tests/fixtures/architecture`, `tests/unit/architecture/dependency-rules.test.ts`)

## Domaine
- [x] T010 [P] [domaine] Tests rouges puis VO `BoardName` (défaut, refus du vide), `Position`, `Rect` (`board-name.ts`, `geometry.ts`)
- [x] T011 [P] [domaine] Tests rouges puis `classifyLink` et `expectedTargets` sur les 10 règles de la grammaire et le hors-grammaire (`grammar.ts`)
- [x] T012 [P] [domaine] Tests rouges puis `frameOf` (centre, cadres imbriqués → plus petit, aucun cadre) et `nextFrameName` (`frame.ts`)
- [x] T013 [domaine] Tests rouges puis `Board` : création, `rename`, `addSticky`, `updateSticky`, `moveSticky`, `removeStickies` (cascade), avec leurs `BoardChange` (`board.ts`, `board-change.ts`, `sticky.ts`, `errors.ts`)
- [x] T014 [domaine] Tests rouges puis liens : `addLink` (refus boucle, post-it inconnu), `reverseLink`, `removeLink`, `outOfGrammar` dérivé et requalifié au changement de type (`board.ts`, `link.ts`)
- [ ] T015 [domaine] Tests rouges puis cadres : `addFrame`, `updateFrame`, `moveFrame` (entraîne les membres), `removeFrame` (`board.ts`)
- [ ] T016 [domaine] Tests rouges puis `duplicate` (copie à `STICKY_SIZE.height + DUPLICATE_GAP` dessous) et `paste` (fragment recentré au pointeur, liens internes copiés, nouveaux identifiants via `IdGenerator`) (`board.ts`)

## Application
- [ ] T020 [application] Ports `BoardStore`, `BoardHistory`, `BoardGateway`, `RecentBoards`, `Clock` ; adaptateurs mémoire pour la BDD (`src/application/ports/*`, `src/infrastructure/memory/*`)
- [ ] T021 [application] Steps BDD + cas d'usage `CreateBoard`, `OpenBoard`, `RenameBoard`, `ListRecentBoards`, `ForgetRecentBoard` ; retirer `@wip` de `creation-tableau.feature`
- [ ] T022 [application] Steps BDD + `PlaceSticky`, `EditSticky`, `MoveSticky`, `DeleteSelection` ; retirer `@wip` de `post-its.feature`
- [ ] T023 [application] Steps BDD + `LinkStickies`, `EditLink` (inverser, supprimer) ; retirer `@wip` de `liens.feature`
- [ ] T024 [application] Steps BDD + `DrawFrame`, `EditFrame` (renommer, redimensionner, déplacer, supprimer) ; retirer `@wip` de `cadres.feature`
- [ ] T025 [application] Steps BDD + `DuplicateSelection`, `CopySelection`, `PasteFragment`, `Undo`, `Redo` ; retirer `@wip` de `selection-historique.feature`

## Infrastructure
- [ ] T030 [P] [infrastructure] Tests rouges puis `YjsBoardStore` : `Y.Doc` ⇄ `Board` (schéma du plan), application des `BoardChange` en transactions d'origine locale ; aller-retour sans perte (`src/infrastructure/yjs/*`)
- [ ] T031 [infrastructure] Tests rouges puis `YjsBoardHistory` (`Y.UndoManager` limité à l'origine locale, une action = une étape)
- [ ] T032 [P] [infrastructure] Tests rouges puis `LocalStorageRecentBoards` (tri, retrait, stockage indisponible ⇒ liste vide sans erreur)
- [ ] T033 [P] [infrastructure] Tests rouges puis `CryptoIdGenerator` (128 bits, base64url), `SystemClock`
- [ ] T034 [infrastructure] Tests Miniflare rouges puis `BoardDurableObject` (création, état initial, fusion des mises à jour, 404, 413, 400) (`tests/workers/board-durable-object.test.ts`)
- [ ] T035 [infrastructure] Tests rouges puis `HttpBoardGateway` (regroupement 500 ms, nouvel essai avec attente croissante, état Enregistré / Enregistrement… / Hors ligne, `sendBeacon` à la fermeture)

## Présentation
- [ ] T040 [présentation] API Hono `/api/boards` (validation des identifiants et des tailles, codes HTTP du plan) + `src/main.worker.ts`
- [ ] T041 [présentation] Accueil : « Nouveau tableau », tableaux récents, retrait (`pages/Home.tsx`) + `src/main.web.tsx`
- [ ] T042 [présentation] Tableau : canvas xyflow, nœud post-it (couleur dérivée, taille fixe, texte en place, police automatique), palette des 9 types, légende (`pages/BoardPage.tsx`, `canvas/*`, `legend/*`)
- [ ] T043 [présentation] Liens : 4 points de connexion, accroche au côté le plus proche, flèche, style et info-bulle hors grammaire (`canvas/*`)
- [ ] T044 [présentation] Cadres : `F` + glisser, nom édité à la création, déplacement entraînant les membres, redimensionnement (`canvas/*`)
- [ ] T045 [présentation] Panneaux contextuels (post-it : type, identifiant EN, notes, supprimer ; lien : inverser, supprimer ; tableau : nom), indicateur d'enregistrement (`panels/*`)
- [ ] T046 [présentation] Sélection, raccourcis (`Suppr`, `Ctrl+D`, `Ctrl+C`/`Ctrl+V`, `Ctrl+Z`/`Ctrl+Y`/`Ctrl+Maj+Z`), navigation (molette, `Espace`+glisser, paliers, ajuster), vue mémorisée (`hooks/*`)

## Tests de bout en bout
- [ ] T050 [e2e] `playwright.config.ts` (serveurs Vite + `wrangler dev`) ; scénarios de la colonne E2E du tableau « Couverture des exigences » du plan (`tests/e2e/*.spec.ts`)
- [ ] T051 [e2e] Mesure 300 post-its + 300 liens (FPS au déplacement et au zoom), non bloquante en CI
- [ ] T052 [ci] Job `e2e` dans `.github/workflows/event-storming-ci.yml` (installation des navigateurs Playwright), séparé de `verify`

## Vérification (`npm run verify`, revue)
- [ ] T060 `npm run verify` et `npm run test:e2e` verts ; plus aucun scénario `@wip` dans `tests/bdd/features/board/`
- [ ] T061 Phase 6 (`test-engineer`), phase 7 (`doc-writer` : `docs/domain/README.md` « Implémenté », README), phase 8 (workflow `review`)
