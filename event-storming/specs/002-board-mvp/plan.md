# Plan 002 — Tableau MVP mono-utilisateur

Entrées : `spec.md` (validée), `docs/domain/README.md` (modèle validé), `tests/bdd/features/board/*.feature` (46 scénarios `@wip`), ADR-0001 → 0016.

## Contrôle constitution et ADR
| Principe/ADR | Respecté ? | Justification / ADR proposé |
|---|---|---|
| Constitution 1 « N'invente rien » | Oui | Q1-Q4 et chevauchement des cadres tranchés par l'utilisateur ; choix techniques non couverts → ADR-0017 (Accepté) |
| Constitution 10 / ADR-0013 — tableau source de vérité, Yjs | Oui | Un `Y.Doc` par tableau ; le domaine produit des `BoardChange`, l'adaptateur Yjs les applique |
| ADR-0002 gratuit / open source | Oui | Dépendances ajoutées, toutes sous licence libre : voir « Contrats externes » |
| ADR-0003 TypeScript, React | Oui | React 19 + Vite (bundler : ADR-0017) |
| ADR-0004 hexagonal | Oui | Le domaine n'importe ni Yjs, ni xyflow, ni React, ni Hono ; deux racines de composition (`src/main.worker.ts`, `src/main.web.tsx`) — **ADR-0017** |
| ADR-0005 Cloudflare | Oui, partiel | Workers + Durable Objects en local (`wrangler dev`) ; **D1 non utilisé** en 002 (liste des tableaux locale, Q2) ; pas de déploiement (Q4) |
| ADR-0006 LLM | n/a | Pas de LLM en 002 |
| ADR-0008 tests | Oui | Unitaires, BDD, Miniflare (via `@cloudflare/vitest-pool-workers`), E2E Playwright |
| ADR-0011 pas de LLM en CI | Oui | — |
| ADR-0012 xyflow | Oui | `@xyflow/react` comme vue ; état dans le `Y.Doc` |
| ADR-0014 contrat d'export | n/a | 003 |
| ADR-0016 UX | Oui | Liste « Reproduire » → tests E2E |

## Modèle de domaine (agrégats, VO, ports touchés)
- `src/domain/board/` : `Board` (immuable), `Sticky`, `Link`, `Frame`, VO `BoardId`, `BoardName`, `Position`, `Rect` ; `BoardChange` (union discriminée) ; services purs `classifyLink`, `expectedTargets` (règle citée par FR-022), `frameOf`, `nextFrameName` ; constantes `STICKY_SIZE = { width: 160, height: 160 }`, `DUPLICATE_GAP = 20` ; erreurs `SelfLinkError`, `UnknownStickyError`, `EmptyBoardNameError`.
- Opérations de `Board`, chacune → `{ board, changes: BoardChange[] }` : `rename`, `addSticky`, `updateSticky` (texte, identifiant, notes, type), `moveSticky`, `removeStickies` (cascade des liens), `addLink`, `reverseLink`, `removeLink`, `addFrame`, `updateFrame` (nom, rectangle), `moveFrame` (entraîne les membres), `removeFrame`, `duplicate(ids)`, `paste(fragment, at)`.
- Port domaine : `IdGenerator`. Ports application : `BoardStore`, `BoardHistory`, `BoardGateway`, `RecentBoards`, `Clock`.

## Fichiers par couche
| Couche | Fichiers créés/modifiés | Tests |
|---|---|---|
| Domaine | `src/domain/board/{board,sticky,link,frame,board-change,grammar,geometry,board-name,errors}.ts`, `sticky-kind.ts` (inchangé) | `tests/unit/domain/board/*.test.ts` |
| Application | `src/application/ports/{board-store,board-history,board-gateway,recent-boards,clock,viewport-store}.ts` ; `src/application/board/{create-board,open-board,rename-board,place-sticky,edit-sticky,move-sticky,move-elements,link-stickies,edit-link,draw-frame,edit-frame,delete-selection,duplicate-selection,copy-selection,paste-fragment,undo,redo}.ts` ; `src/application/recent-boards/{list,forget}.ts` | BDD `tests/bdd/steps/board/*.steps.ts` (adaptateurs en mémoire) |
| Infrastructure | `src/infrastructure/yjs/{yjs-board-store,yjs-board-history,board-doc-schema}.ts` ; `src/infrastructure/http/http-board-gateway.ts` ; `src/infrastructure/browser/{local-storage-recent-boards,local-storage-viewports}.ts` ; `src/infrastructure/cloudflare/board-durable-object.ts` ; `src/infrastructure/system/{crypto-id-generator,system-clock}.ts` ; `src/infrastructure/memory/*` (adaptateurs de test) | `tests/unit/infrastructure/*.test.ts` ; `tests/workers/board-durable-object.test.ts` (Miniflare) |
| Présentation | `src/presentation/api/{app,routes}.ts` (Hono) ; `src/presentation/web/{App.tsx,pages/Home.tsx,pages/BoardPage.tsx,canvas/*,panels/*,legend/*,hooks/*}` | `tests/e2e/*.spec.ts` (Playwright) |
| Composition | `src/main.worker.ts` (Worker : Hono + Durable Object), `src/main.web.tsx` (React : adaptateurs Yjs, HTTP, localStorage) | E2E |
| Outillage | `package.json`, `vite.config.ts`, `wrangler.toml`, `tsconfig.json` (+ `tsconfig.web.json` : DOM, JSX), `playwright.config.ts`, `vitest.workers.config.ts`, `.dependency-cruiser.cjs` (racines `main.*`), `index.html` | `npm run verify`, `npm run test:e2e` |

## Contrats externes (API, LLM, persistance)
**API HTTP (Worker Hono, préfixe `/api`)** — corps binaires = mises à jour Yjs (`application/octet-stream`), taille max 1 Mio :
| Méthode | Route | Réponse |
|---|---|---|
| `POST` | `/api/boards` | `201 { id }` — crée le Durable Object du tableau (identifiant : 128 bits aléatoires, base64url) |
| `GET` | `/api/boards/:id` | `200` état Yjs complet · `404 { error: "BOARD_NOT_FOUND" }` |
| `POST` | `/api/boards/:id/updates` | `204` — fusionne la mise à jour dans l'état · `404` · `413` si > 1 Mio · `400` si mise à jour Yjs illisible |

**Synchronisation client** : les mises à jour locales du `Y.Doc` sont regroupées et envoyées toutes les 500 ms au plus (et à la fermeture de page via `sendBeacon`) ; en cas d'échec, nouvel essai avec attente croissante, indicateur « Hors ligne » (FR-004). Le serveur ne fait que fusionner (`Y.applyUpdate`) : en mono-utilisateur, aucun conflit à arbitrer.

**Schéma du `Y.Doc`** (`board-doc-schema.ts`) : `meta: Y.Map { name }`, `stickies: Y.Map<id, Y.Map{kind,label,identifier,notes,x,y}>`, `links: Y.Map<id, Y.Map{sourceId,targetId}>`, `frames: Y.Map<id, Y.Map{name,x,y,width,height}>`. Chaque `BoardChange` = une transaction Yjs d'origine locale ; `Y.UndoManager` suit cette origine (FR-044), une action utilisateur = une étape d'annulation.

**Stockage navigateur** (`localStorage`, lecture/écriture protégées par try/catch) : `es:recent-boards` (liste `{ id, name, openedAt }`), `es:viewport:<id>` (`{ x, y, zoom }`, FR-052).

**Dépendances ajoutées** : `react`, `react-dom` (MIT), `@xyflow/react` (MIT), `yjs` (MIT), `vite`, `@vitejs/plugin-react` (MIT), `wrangler` (MIT/Apache-2.0), `@cloudflare/workers-types` (MIT/Apache-2.0), `@cloudflare/vitest-pool-workers` (MIT), `@playwright/test` (Apache-2.0), `@types/react`, `@types/react-dom` (MIT).

## Couverture des exigences
| FR | Couvert par |
|---|---|
| 001, 002, 005, 006 | `creation-tableau.feature` ; E2E accueil |
| 003, 004 | test Durable Object (Miniflare) ; E2E « rouvrir le navigateur restitue le tableau », indicateur |
| 010, 011, 014, 015, 017 | `post-its.feature` |
| 012, 013, 016 | E2E (pose au clic + édition, police auto, légende) |
| 020, 021 | E2E (points de connexion, accroche) |
| 022, 023, 024 | `liens.feature` ; E2E style hors grammaire + info-bulle |
| 030, 031, 032 | `cadres.feature` ; E2E `F` + glisser |
| 040 | E2E (lasso, `Maj`+clic) |
| 041 – 044 | `selection-historique.feature` ; E2E raccourcis |
| 050 – 052 | E2E navigation |
| Perf. 300 + 300 | E2E de mesure (FPS via `requestAnimationFrame`), non bloquant en CI |

## Risques et alternatives
- **xyflow et 600 éléments** : risque de lenteur → `nodeTypes` mémoïsés, `onlyRenderVisibleElements` ; mesure dédiée. Alternative si insuffisant : rendu canvas des liens (nouvel ADR).
- **Cadres dans xyflow** : les groupes xyflow (`parentId`) imposent la hiérarchie à la vue ; on **ne les utilise pas** — l'appartenance reste calculée par le domaine (`frameOf`), le cadre est un nœud ordinaire placé dessous.
- **E2E en CI** : Playwright + `wrangler dev` alourdissent la CI → job séparé `e2e`, hors `verify`.
- **Durable Objects en local** : simulés par Miniflare (inclus dans `wrangler`), sans compte Cloudflare (Q4).
- **`@cloudflare/vitest-pool-workers` déprécié** au profit de `@cloudflare/vitest-plugin` : il fonctionne encore pour `npm run test:workers` ; migration à prévoir ultérieurement (hors 002).

## Questions ouvertes
- Aucune : plan et ADR-0017 validés par l'utilisateur (2026-10-18).
