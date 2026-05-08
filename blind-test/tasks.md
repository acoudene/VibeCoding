# Blind Test — Tasks (v1)

> Découpage fin du `plan.md`. Chaque sous-tâche = un commit logique avec un critère d'acceptation explicite.
> Convention de nommage : `Tx.y` où `Tx` est la tâche du plan, `y` la sous-tâche.
> Conventions de commits : `feat(domain): ...`, `feat(app): ...`, `feat(infra): ...`, `feat(ui): ...`, `test: ...`, `chore: ...`, `ci: ...`, `docs: ...`.

---

## Phase 0 — Squelette projet

### T1 — Init Next.js + tooling

**T1.1** Init pnpm + Next.js 15 (App Router) + TS

- Cmd : `pnpm create next-app@latest . --ts --eslint --app --src-dir --import-alias "@/*" --tailwind --no-turbopack`
- Acceptation : `pnpm dev` démarre sur localhost:3000 avec la page Next par défaut.
- Commit : `chore: init next.js 15 with typescript and tailwind`

**T1.2** TypeScript strict + paths

- Activer `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true` dans `tsconfig.json`.
- Acceptation : `pnpm tsc --noEmit` passe.
- Commit : `chore(ts): enable strict mode and noUncheckedIndexedAccess`

**T1.3** Prettier + config ESLint personnalisée

- Ajouter `prettier`, `eslint-config-prettier`. Règles : pas de console.log, imports triés.
- Acceptation : `pnpm lint` et `pnpm format --check` passent sur le projet vide.
- Commit : `chore: add prettier and tighten eslint config`

**T1.4** Installer Vitest + setup minimal

- Deps : `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.
- Fichier `vitest.config.ts` avec deux projets : `unit` (jsdom) et `node` (pour le domaine).
- Test fumée `tests/unit/smoke.test.ts` (`expect(1+1).toBe(2)`).
- Acceptation : `pnpm test:unit` passe.
- Commit : `chore(test): set up vitest with unit and node projects`

**T1.5** Installer Playwright

- Cmd : `pnpm dlx playwright install --with-deps chromium`.
- `playwright.config.ts` minimal avec `webServer: { command: "pnpm build && pnpm start", port: 3000 }`.
- Test fumée `tests/e2e/smoke.spec.ts` qui visite `/` et vérifie un titre.
- Acceptation : `pnpm test:e2e` passe localement.
- Commit : `chore(test): set up playwright with smoke test`

**T1.6** Scripts npm

- `package.json` scripts : `dev`, `build`, `start`, `lint`, `format`, `typecheck`, `test:unit`, `test:integration`, `test:arch`, `test:e2e`, `test`.
- Acceptation : tous les scripts existent et `pnpm test` enchaîne unit + integration + arch.
- Commit : `chore: add npm scripts`

### T2 — CI GitHub Actions

**T2.1** Workflow `quality`

- `.github/workflows/ci.yml` : job `quality` qui run `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:integration`, `pnpm test:arch` sur push et PR.
- Acceptation : workflow vert sur le 1er push.
- Commit : `ci: add quality workflow`

**T2.2** Workflow `e2e` avec soketi service

- Job `e2e` : service container `quay.io/soketi/soketi:1-16-debian` sur port 6001, env vars Pusher pointant vers soketi, run `pnpm build && pnpm test:e2e`.
- Acceptation : workflow vert (peut être skippé sur PR avec `if: github.event_name == 'push'`).
- Commit : `ci: add e2e workflow with soketi service`

### T3 — Test architectural

**T3.1** Tests d'imports interdits

- `tests/architecture/layers.test.ts` : pour chaque fichier `src/domain/**/*.ts`, lire le contenu, échouer si `from "@/application"`, `"@/infrastructure"`, `"@/app"` ou paths relatifs équivalents.
- Idem pour `src/application/**/*.ts` qui ne doit pas importer `@/infrastructure` ni `@/app`.
- Acceptation : `pnpm test:arch` passe sur arborescence vide.
- Commit : `test(arch): forbid cross-layer imports`

### T4 — README

**T4.1** README minimal

- Sections : intro, prérequis, install, scripts, structure, déploiement.
- Acceptation : README rendu correct sur GitHub.
- Commit : `docs: add minimal readme`

---

## Phase 1 — Domaine pur (TDD)

> Pour chaque sous-tâche : test rouge d'abord, code minimal pour passer au vert, refactor.

### T5 — Value objects de base

**T5.1** `Player` (id, nickname, score, connected)

- Tests : nickname non vide, ≤ 20 chars, score ≥ 0 entier ou demi (0.5 step).
- Commit : `feat(domain): add Player value object` + `test(domain): player invariants`

**T5.2** `Track` (expectedTitle, expectedArtist, youtubeId, startSeconds?)

- Tests : champs requis non vides, youtubeId regex `[A-Za-z0-9_-]{11}`, startSeconds optionnel ≥ 0.
- Commit : `feat(domain): add Track value object`

**T5.3** `Playlist` (id, name, tracks[])

- Tests : nom non vide, ≥ 1 track pour démarrer, ordre des tracks préservé.
- Commit : `feat(domain): add Playlist aggregate`

### T6 — RoomCode

**T6.1** Validateur `RoomCode.isValid(s)`

- Alphabet : `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sans O/0/I/1).
- Tests : longueur 6, alphabet respecté, casse insensible côté entrée → uppercase normalisé.
- Commit : `feat(domain): add RoomCode validator`

**T6.2** Générateur via port `CodeGenerator`

- Le domaine ne génère pas l'aléa : la fabrique `Room.create(code, ...)` reçoit un code déjà fabriqué. Mais on expose une fonction pure `generateCode(rng: () => number): string` qui sera utilisée par l'adapter.
- Tests : avec rng déterministe, sortie reproductible, toujours valide.
- Commit : `feat(domain): add deterministic room code generator`

### T6bis — Import de playlist (parser pur)

> Domaine pur, aucune I/O. Fixture : copier `playlist.json` (racine du repo) vers `tests/unit/fixtures/youtube-playlist.json`.

**T6bis.1** Détection de format

- `detectFormat(json: unknown): "native" | "youtube" | "unknown"`.
  - `"youtube"` ssi `kind === "youtube#playlistItemListResponse"`.
  - `"native"` ssi structure de l'export natif (présence d'un champ `tracks: Track[]` + `name`).
  - `"unknown"` sinon.
- Tests : trois cas + JSON malformé → `"unknown"`.
- Commit : `feat(domain): add playlist format detector`

**T6bis.2** Parseur natif

- `parseNativePlaylist(json): { playlist: Playlist; imported: number; skipped: number }`.
- Validation Zod du schéma natif. Erreur typée `InvalidPlaylistFileError` si non conforme.
- Commit : `feat(domain): add native playlist parser`

**T6bis.3** Heuristique `Artiste - Titre`

- Fonction pure `parseTitleArtist(rawTitle: string, fallbackArtist: string): { title: string; artist: string }`.
- Étapes : retirer suffixes parasites entre `()` ou `[]` (regex insensible à la casse sur `Official Video`, `Official Music Video`, `Clip Officiel`, `Audio`, `Lyrics`, `HD`, `4K`, `Visualizer`, `Lyric Video`), trim, puis split sur `-` (premier match) → `{ artist, title }`. Si pas de séparateur → `{ artist: fallbackArtist, title: cleaned }`.
- Tests : cas Lizzo (`"Lizzo - Juice (Official Video)"` → `{artist:"Lizzo", title:"Juice"}`), SAULE (`[CLIP OFFICIEL]`), titre sans tiret, titre avec plusieurs `-` (split sur le premier), titre vide → erreur.
- Commit : `feat(domain): add title/artist heuristic parser`

**T6bis.4** Parseur YouTube `playlistItemListResponse`

- `parseYouTubePlaylist(json, opts?: { now?: () => Date }): { playlist: Playlist; imported: number; skipped: number }`.
- Validation Zod laxe (on ne vérifie que les champs utilisés : `kind`, `items[].snippet.{title,position,resourceId.videoId,videoOwnerChannelTitle}`).
- Pour chaque item :
  - skip si `videoId` absent/vide ou si `title ∈ {"Private video", "Deleted video", "[Private video]", "[Deleted video]"}`.
  - sinon : `youtubeId = videoId`, applique `parseTitleArtist(title, videoOwnerChannelTitle)`, `startSeconds = undefined`.
- Tri par `snippet.position` croissant ; à défaut, ordre d'apparition.
- Nom de la playlist générée : `"Import YouTube — YYYY-MM-DD"` (date issue de `opts.now()` injectable, défaut `new Date()` — pour rester pur, le caller injecte la date).
- Tests :
  - sur la fixture `youtube-playlist.json` : `imported === 46`, `skipped === 0`, `playlist.tracks.length === 46`.
  - tracks ordonnés par position (vérifier 1er = `XaCrQL_8eMY` Lizzo, 2e = `8mCLc332sTM` SAULE).
  - cas synthétiques : item `"Private video"` skippé, item sans `videoId` skippé, item avec position désordonnée → tri correct, items multiples skipés → compteur correct.
  - `kind` manquant → `InvalidPlaylistFileError`.
- Commit : `feat(domain): add youtube playlistItemListResponse parser`

**T6bis.5** Façade `importPlaylist`

- `importPlaylist(json, opts?): { playlist; imported; skipped; format: "native"|"youtube" }` qui orchestre `detectFormat` puis dispatche. `"unknown"` → `InvalidPlaylistFileError`.
- Tests : dispatch correct sur les deux fixtures, erreur sur format inconnu.
- Commit : `feat(domain): add importPlaylist facade`

### T7 — Room : création, join, leave

**T7.1** `Room.create(code, hostId, playlist, clock)`

- État initial : `lobby`, players vides, rounds vides.
- Tests : code stocké, hostId stocké, status lobby.
- Commit : `feat(domain): add Room.create`

**T7.2** `Room.join(playerId, nickname)`

- Tests : ajoute player, refuse si pseudo dupliqué (case-insensitive), refuse si > 8 joueurs, refuse si status != lobby (sauf reconnect — voir T7.4), refuse si playerId == hostId (R8).
- Commit : `feat(domain): add Room.join with capacity and uniqueness checks`

**T7.3** `Room.leave(playerId)`

- Tests : marque le joueur `connected: false` mais conserve son score (R7). Si tous les joueurs sont partis et status playing, la salle reste (le serveur la gère par TTL).
- Commit : `feat(domain): add Room.leave preserving score`

**T7.4** Reconnexion (`Room.reconnect`)

- Tests : si même playerId + même pseudo → flag `connected: true`, score préservé. Si pseudo différent → erreur.
- Commit : `feat(domain): add Room.reconnect`

### T8 — Room : start, playNextTrack

**T8.1** `Room.start()`

- Tests : status passe à `playing`, refuse si lobby vide, refuse si status != lobby, crée le round 0 (status `playing`).
- Commit : `feat(domain): add Room.start`

**T8.2** `Room.playNextTrack()`

- Tests : avance le `currentTrackIndex`, recrée un round propre (blockedPlayerIds vide), refuse si plus de tracks → status `finished`, refuse si round courant non résolu.
- Commit : `feat(domain): add Room.playNextTrack and finish detection`

### T9 — Round + buzz

**T9.1** Entité `Round`

- Champs : `trackIndex`, `status: "playing" | "buzzed" | "resolved"`, `currentBuzzer?: PlayerId`, `blockedPlayerIds: Set<PlayerId>`, `outcome?: "correct"|"wrong"|"half"|"skip"`.
- Tests : transitions valides uniquement.
- Commit : `feat(domain): add Round entity with state machine`

**T9.2** `Room.buzz(playerId, at)` — règles R1, R2, R3, R4

- Tests :
  - R1 : refuse si round status != playing → `RoundNotPlayingError`.
  - R2 : refuse si round status == buzzed (déjà un buzz en cours) → `BuzzAlreadyTakenError`.
  - R3 : si deux appels arrivent avec timestamps différents, le plus petit gagne (ordering déterministe).
  - R4 : refuse si playerId ∈ blockedPlayerIds → `PlayerBlockedError`.
- Commit : `feat(domain): add Room.buzz with R1-R4 rules` + `test(domain): buzz arbitration rules`

### T10 — Validate + scoring + fin

**T10.1** `Room.validate("correct" | "wrong" | "half" | "skip")` — règles R5, R6

- Tests :
  - `correct` : +1 point au currentBuzzer, round → resolved, outcome correct.
  - `half` : +0.5 au currentBuzzer, round → resolved, outcome half.
  - `wrong` : currentBuzzer ajouté à blockedPlayerIds, round retourne à `playing`, currentBuzzer remis à null. Si tous bloqués → round → resolved sans gagnant.
  - `skip` : round → resolved sans points, outcome skip.
  - Refuse si round status != buzzed (pour correct/wrong/half) ; skip est autorisé en `playing` ou `buzzed`.
- Commit : `feat(domain): add Room.validate with scoring rules`

**T10.2** Fin de partie

- Tests : après validate sur le dernier track, `Room.playNextTrack()` lève `NoMoreTracksError` et bascule status à `finished`. Le classement final est une projection pure `Room.leaderboard()`.
- Commit : `feat(domain): add leaderboard projection and finished state`

**T10.3** Couverture domaine ≥ 90 %

- `pnpm test:unit --coverage` doit afficher ≥ 90 % sur `src/domain/`.
- Acceptation : seuil dans `vitest.config.ts` (`coverage.thresholds.lines: 90`).
- Commit : `test(domain): enforce 90% coverage threshold`

---

## Phase 2 — Application + adapters in-memory

### T11 — Ports

**T11.1** Définir les 4 ports

- `src/application/ports/{room-repository,realtime-channel,clock,code-generator}.ts`.
- Acceptation : interfaces compilent, pas d'implémentation encore.
- Commit : `feat(app): define application ports`

### T12 — Use cases (TDD)

> Chaque use case : un fichier dans `src/application/use-cases/`, un fichier de test dans `tests/integration/`. Adapters in-memory partagés via `tests/integration/test-doubles/`.

**T12.1** Test doubles

- `FakeRoomRepository`, `FakeRealtimeChannel` (enregistre `published`), `FakeClock`, `FakeCodeGenerator`.
- Commit : `test(integration): add fake adapters`

**T12.2** `CreateRoom`

- Input : `{ hostId, playlist }`. Output : `{ code }`. Effet : Room sauvée, événement publié `room:created`.
- Commit : `feat(app): add CreateRoom use case`

**T12.3** `JoinRoom`

- Input : `{ code, playerId, nickname }`. Effet : Room.join, save, publish `player:joined`.
- Erreurs : `RoomNotFoundError`, propage erreurs de domaine.
- Commit : `feat(app): add JoinRoom use case`

**T12.4** `StartGame`

- Effet : Room.start, save, publish `game:started` + `track:ready` (index 0).
- Garde-fou : seul l'host peut démarrer (vérif `hostId`).
- Commit : `feat(app): add StartGame use case`

**T12.5** `PlayTrack`

- Effet : publish `track:started` (le hôte lance YT côté UI). Pas de transition de domaine ici (le round est créé par `start` ou `playNextTrack`).
- Commit : `feat(app): add PlayTrack use case`

**T12.6** `Buzz`

- Effet : Room.buzz(playerId, clock.now()), save, publish `buzz:taken` avec playerId + nickname.
- Commit : `feat(app): add Buzz use case`

**T12.7** `ValidateAnswer`

- Input : `{ code, hostId, outcome }`. Vérif host. Effet : Room.validate, save, publish `round:resolved` (+ scores). Si correct/half/skip et il reste des tracks → publish `track:ready` next index. Sinon → publish `game:finished` avec leaderboard.
- Commit : `feat(app): add ValidateAnswer use case with round resolution flow`

**T12.8** `LeaveRoom`

- Effet : Room.leave, save, publish `player:left`.
- Commit : `feat(app): add LeaveRoom use case`

### T13 — Adapters infrastructure (in-memory + utilitaires)

**T13.1** `InMemoryRoomRepository`

- `Map<code, Room>` au niveau module (singleton process-wide). Pour Next.js dev mode avec HMR, utiliser `globalThis.__roomRepo__` pour survivre aux reloads.
- Tests : save/find/delete.
- Commit : `feat(infra): in-memory room repository with HMR-safe singleton`

**T13.2** `SystemClock`

- Implémente `Clock` avec `Date.now()`.
- Commit : `feat(infra): system clock`

**T13.3** `RandomCodeGenerator`

- Utilise `crypto.getRandomValues` pour le RNG, appelle `generateCode` du domaine.
- Tests : sortie respecte `RoomCode.isValid`.
- Commit : `feat(infra): random room code generator`

---

## Phase 3 — Pusher + routes API

### T14 — Adapter Pusher

**T14.1** `PusherRealtimeChannel` (server)

- Wrap `pusher` (server SDK). `publish` → `pusher.trigger`. `authorizePresence` → `pusher.authorizeChannel`.
- Variables d'env lues via un module `src/infrastructure/realtime/pusher-config.ts`.
- Tests : adapter mocké via injection (pas de réseau).
- Commit : `feat(infra): pusher server adapter`

**T14.2** `pusher-client.ts` (browser)

- Singleton client `pusher-js` ; helper `subscribePresence(channel, handlers)`.
- Commit : `feat(infra): pusher browser client`

**T14.3** Endpoint `pusher-auth`

- `POST /api/rooms/[code]/pusher-auth` : reçoit `socket_id`, `channel_name`, `playerId`, `nickname` (depuis cookie/body), retourne `auth` via le port.
- Commit : `feat(api): pusher presence auth endpoint`

### T15 — Routes API

**T15.1** Composition des dépendances

- `src/app/api/_di.ts` : factory qui retourne les use cases câblés avec les adapters concrets. Singleton.
- Commit : `feat(api): wire dependencies for api routes`

**T15.2** `POST /api/rooms` (CreateRoom)

- Body : `{ playlist }`. Cookie/header pour `hostId` (UUID généré côté client si absent). Réponse : `{ code }`.
- Commit : `feat(api): create room endpoint`

**T15.3** `POST /api/rooms/[code]/join`

- Body : `{ playerId, nickname }`. Réponse : `{ ok: true }`.
- Commit : `feat(api): join room endpoint`

**T15.4** `POST /api/rooms/[code]/start`

- Vérif `hostId`. Réponse : `{ ok: true }`.
- Commit : `feat(api): start game endpoint`

**T15.5** `POST /api/rooms/[code]/play-track`

- Vérif `hostId`. Body : `{ trackIndex }` (anti-rejeu).
- Commit : `feat(api): play track endpoint`

**T15.6** `POST /api/rooms/[code]/buzz`

- Body : `{ playerId }`. Le timestamp est pris **côté serveur** (R3).
- Commit : `feat(api): buzz endpoint`

**T15.7** `POST /api/rooms/[code]/validate`

- Vérif `hostId`. Body : `{ outcome }`.
- Commit : `feat(api): validate answer endpoint`

**T15.8** Tests d'intégration HTTP

- Pour chaque endpoint, test bout-en-bout avec adapters in-memory + FakeRealtimeChannel injectés via DI override. Vitest + `next-test-api-route-handler` ou simple appel direct au handler.
- Commit : `test(api): integration tests for all endpoints`

---

## Phase 4 — UI hôte

### T16 — Accueil

**T16.1** Page `/`

- Deux cartes : "Créer une salle" (→ `/host/playlists`) et "Rejoindre" (saisie code → `/play/[code]`).
- Commit : `feat(ui): home page with create/join entries`

### T17 — CRUD playlists

**T17.1** `LocalStoragePlaylistRepository` (client)

- Implémente `PlaylistRepository` (à ajouter dans `application/ports/`). Stocke sous `bt:playlists:v1`. Sérialise/désérialise via Zod.
- Commit : `feat(infra): local storage playlist repository`

**T17.2** Page `/host/playlists` (liste)

- Affiche les playlists, boutons créer/dupliquer/supprimer/exporter/importer.
- Commit : `feat(ui): playlists list page`

**T17.3** Page `/host/playlists/[id]` (édition)

- Formulaire `<TrackForm>` : titre, artiste, URL YouTube (extraction auto de l'ID), startSeconds. Drag-and-drop pour réordonner.
- Commit : `feat(ui): playlist editor page`

**T17.4** Export / import JSON (natif + YouTube)

- Export : `Blob` téléchargé (format natif).
- Import : `<input type="file" accept="application/json,.json">` ; appel à `importPlaylist` (T6bis.5) qui détecte automatiquement le format (natif ou YouTube `playlistItemListResponse`).
- UI : après un import réussi, toast/banner `"X / Y morceaux importés"` (avec X = `imported`, Y = `imported + skipped`). Si `skipped > 0`, mention discrète des items écartés (vidéos privées/supprimées).
- En cas de `InvalidPlaylistFileError` : message d'erreur explicite `"Format de fichier non reconnu (attendu : export Blind Test ou playlist YouTube)."`.
- Pas de re-validation du format ici : la garantie vient du domaine. Aucun appel réseau.
- Commit : `feat(ui): playlist json import with native and youtube formats`

### T18 — Déjà couvert en T17.1.

### T19 — Lobby hôte

**T19.1** Page `/host/rooms/[code]`

- Affiche code en gros + lien partageable (avec bouton "copier").
- Liste des joueurs présents (presence channel Pusher).
- Bouton "Démarrer" désactivé tant que zéro joueur.
- Commit : `feat(ui): host lobby with presence and start button`

### T20 — Vue partie hôte

**T20.1** Lecteur YouTube intégré

- Composant `<YouTubePlayer trackId startSeconds onReady onPlay onPause />` qui charge l'IFrame API une seule fois.
- Commit : `feat(ui): youtube player wrapper`

**T20.2** Layout vue partie hôte

- Header : track N/M, état du round, lecteur YT.
- Panneau : réponse attendue (visible host uniquement), boutons `Lecture`, `Pause`.
- Panneau validation : `Correct`, `Faux`, `Demi`, `Passer` — visibles seulement quand un joueur a buzzé (état `buzzed`).
- Liste scores latérale.
- Commit : `feat(ui): host game view with validation panel`

**T20.3** Câblage temps réel hôte

- S'abonne à `room-{code}` events : `buzz:taken`, `round:resolved`, `track:ready`, `game:finished`. Met à jour l'état local.
- Sur `buzz:taken` : pause auto du player YT.
- Sur `round:resolved` ou `track:ready` : autorise reprise par l'hôte (clic explicite).
- Commit : `feat(ui): host realtime wiring`

**T20.4** Écran fin de partie

- Affiche le leaderboard final + bouton "nouvelle partie" (recrée une salle avec la même playlist).
- Commit : `feat(ui): host end-of-game view`

---

## Phase 5 — UI joueur

### T21 — Rejoindre

**T21.1** Page `/play/[code]`

- Si pas encore enregistré : formulaire pseudo. Enregistre `playerId` (UUID) + `nickname` dans `sessionStorage` sous clé `bt:player:{code}`.
- Si déjà enregistré (reload) : reconnect direct.
- Commit : `feat(ui): player join page with session persistence`

**T21.2** Lobby joueur

- Liste des joueurs, message d'attente "L'hôte va démarrer la partie…".
- Commit : `feat(ui): player lobby`

### T22 — Vue partie joueur

**T22.1** Bouton Buzz

- Composant plein écran (sur mobile : tap géant, vibration `navigator.vibrate(50)` si dispo).
- Désactivé si round status != `playing` ou si `me ∈ blockedPlayerIds` ou si déjà buzzé.
- Commit : `feat(ui): big buzz button with state-aware disabling`

**T22.2** Affichage état + scores

- Bandeau : "Track 5/20 — En lecture / X a buzzé / Round résolu". Liste scores.
- Commit : `feat(ui): player status banner and scores`

**T22.3** Câblage temps réel joueur

- S'abonne à `room-{code}`, gère les mêmes events que l'hôte mais sans contrôles.
- Commit : `feat(ui): player realtime wiring`

### T23 — Reconnexion

**T23.1** Reconnect côté API

- `POST /api/rooms/[code]/join` avec `playerId` existant : appelle `Room.reconnect` au lieu de `join`.
- Commit : `feat(api): handle reconnection in join endpoint`

**T23.2** Reconnect côté UI joueur

- Au montage de `/play/[code]`, si `bt:player:{code}` existe en sessionStorage, POST direct sans afficher le formulaire pseudo.
- Commit : `feat(ui): auto-reconnect player from session`

---

## Phase 6bis — Diffusion audio WebRTC

> Aucune dépendance externe nouvelle. Utilise les API navigateur natives (`RTCPeerConnection`, `getDisplayMedia`) et le canal Pusher existant pour la signalisation (client events).

### T30 — Domaine : `Round.startedAt` + R9

**T30.1** Ajouter `startedAt: number` à `Round`

- Mis à `clock.now()` lors de la création du round (constructor / `Round.start`).
- Tests : un Round nouvellement créé a `startedAt` égal à la valeur fournie.
- Commit : `feat(domain): track round startedAt for grace period`

**T30.2** R9 — `BuzzTooEarlyError`

- Erreur typée dans `domain/errors.ts`.
- `Room.buzz(playerId, at)` : refuse si `at - currentRound.startedAt < 500` ms (constante `BUZZ_GRACE_MS = 500` exportée).
- Tests : buzz à `startedAt + 0/100/499` rejeté ; buzz à `startedAt + 500` accepté ; les autres règles R1-R4 restent prioritaires.
- Commit : `feat(domain): R9 reject buzz during 500ms grace period`

### T31 — Application : propagation R9

**T31.1** `PlayTrack` injecte `startedAt` via `Clock`

- À chaque appel, le use case fixe `startedAt = clock.now()` sur le round courant (le domaine recrée le round propre via `playNextTrack`).
- Tests intégration : `track.startedAt` correspond à `FakeClock.now()` au moment de l'appel.
- Commit : `feat(app): set startedAt on play-track`

**T31.2** `Buzz` propage `BuzzTooEarlyError` en HTTP 409

- Mapper l'erreur côté API (`/api/rooms/[code]/buzz`) en `409 Conflict { error: "buzz_too_early" }`.
- Tests d'intégration HTTP couvrant le cas.
- Commit : `feat(api): map BuzzTooEarlyError to 409`

### T32 — Infrastructure : configuration ICE

**T32.1** `ice-config.ts` (côté client uniquement)

- Fonction pure `buildIceServers(env: { TURN_URL?, TURN_USERNAME?, TURN_CREDENTIAL? }): RTCIceServer[]`.
- Toujours inclure `stun:stun.l.google.com:19302` et `stun:stun.cloudflare.com:3478`.
- Si TURN défini : ajouter `{ urls: env.TURN_URL, username, credential }`.
- Tests unitaires : 4 cas (rien défini, juste TURN_URL, TURN complet, TURN_URL sans creds → ignoré).
- Commit : `feat(infra): build ICE servers from env`

### T33 — Infrastructure : `audio-broadcaster.ts` (hôte)

**T33.1** Capture audio onglet

- Fonction `captureTabAudio(): Promise<MediaStream>` qui appelle `navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })` (vidéo demandée par contrainte navigateur, mais le flux vidéo n'est pas réutilisé) puis garde uniquement les pistes audio. Lève `AudioCaptureUnsupportedError` si l'API manque, `AudioCaptureDeniedError` si l'utilisateur refuse.
- Tests : mocks de `mediaDevices` (rejet, refus, succès).
- Commit : `feat(infra): capture tab audio via getDisplayMedia`

**T33.2** Classe `AudioBroadcaster`

- API : `connect(playerId)`, `disconnect(playerId)`, `disconnectAll()`, `setStream(stream)`, `onStateChange((playerId, state) => void)`.
- Pour chaque `connect(playerId)` :
  - Crée un `RTCPeerConnection(rtcConfig)`.
  - `addTrack(audioTrack, stream)` pour chaque piste audio du flux capturé.
  - `createOffer()` → `setLocalDescription` → publie `client-rtc-offer { to: playerId, sdp }`.
  - Émet ses ICE candidates en `client-rtc-ice { to: playerId, candidate }`.
  - Reçoit `client-rtc-answer { from: playerId, sdp }` et `client-rtc-ice { from: playerId, candidate }` filtrés sur `to === me`.
- Émet les transitions d'état (`new → connecting → connected | failed`).
- Tests : utilisation de stubs `RTCPeerConnection` faux (pas de vrai WebRTC en test unitaire) pour vérifier l'orchestration des messages.
- Commit : `feat(infra): audio broadcaster (host side)`

### T34 — Infrastructure : `audio-receiver.ts` (joueur)

**T34.1** Classe `AudioReceiver`

- API : `start()`, `stop()`, `retry()`, `setVolume(0..1)`, `onStateChange((state) => void)`.
- À `start()` :
  - Crée un `RTCPeerConnection(rtcConfig)`.
  - Souscrit aux client events Pusher du presence channel ; ne traite que ceux où `to === playerId`.
  - À réception d'une `client-rtc-offer` : `setRemoteDescription` → `createAnswer` → `setLocalDescription` → publie `client-rtc-answer`.
  - `pc.ontrack`: branche le premier `MediaStream` audio sur un `<audio>` créé hors DOM (`new Audio()`) et `play()`.
  - Timeout 10 s sans `connected` → état `failed`.
- Tests : stubs `RTCPeerConnection`.
- Commit : `feat(infra): audio receiver (player side)`

### T35 — UI hôte : indicateurs audio

**T35.1** Hook `useAudioBroadcaster`

- Initialise `AudioBroadcaster` quand l'hôte démarre la partie. À chaque `presence:joined`, appelle `broadcaster.connect(playerId)`. À chaque `presence:left`, `broadcaster.disconnect(playerId)`.
- Expose `Map<playerId, "connecting"|"connected"|"failed">`.
- Commit : `feat(ui): host audio broadcaster hook`

**T35.2** Bouton "Activer l'audio" + état par joueur

- Avant `start()`, bouton "Activer l'audio" sur la vue hôte (déclenche `getDisplayMedia`). Si `start()` est cliqué sans audio, prompt `confirm("Démarrer sans audio ?")`.
- Liste joueurs : pastille verte/orange/rouge selon l'état audio.
- Commit : `feat(ui): host audio toggle and per-player status indicators`

### T36 — UI joueur : audio + anti-fuite

**T36.1** Hook `useAudioReceiver`

- Initialise `AudioReceiver` au montage de la vue partie joueur.
- Expose `state`, `setVolume`, `retry`.
- Commit : `feat(ui): player audio receiver hook`

**T36.2** UI : slider volume + bouton "Réessayer" + état

- Sous le bouton Buzz : un petit panneau "🔊 connecté/connexion…/échec" + slider volume + bouton "Réessayer" si `failed`.
- Vibration sur buzz conservée.
- **Aucune** ligne de code de la vue joueur ne référence `videoId`, `expectedTitle`, `expectedArtist`, `youtubeId`. Pas d'import de `<YouTubePlayer>` dans `/play/**`.
- Commit : `feat(ui): player audio panel and anti-leak guard`

---

## Phase 6 — E2E + déploiement

### T24 — Happy path

**T24.1** Scénario Playwright

- 2 contextes navigateurs : hôte et 1 joueur.
- Hôte crée playlist (2 tracks hardcodés en fixture), crée salle, copie code. Joueur rejoint avec pseudo. Hôte démarre. Hôte lance track. Joueur buzze. Hôte clique Correct. Track suivant. Joueur buzze. Hôte clique Correct. Écran final affiche joueur en tête.
- Commit : `test(e2e): happy path complete game`

### T25 — Buzz faux + re-buzz

**T25.1** Scénario 3 contextes

- Hôte + 2 joueurs. Joueur A buzze, hôte clique Faux. Joueur A voit son bouton désactivé (blocked). Joueur B buzze, hôte clique Correct.
- Commit : `test(e2e): wrong answer blocks player and re-buzz works`

### T26 — Passer le tour

**T26.1** Scénario passer

- Hôte démarre, lance track, clique Passer immédiatement (sans buzz). Track suivant. Aucun score modifié.
- Commit : `test(e2e): host can skip a track`

**T26.2** Anti-fuite côté joueur

- Pendant un tour en cours : `expect(playerPage.locator('body')).not.toContainText(expectedTitle)` ; `expect(playerPage.locator('body')).not.toContainText(expectedArtist)` ; `expect(await playerPage.content()).not.toContain(videoId)` ; `expect(playerPage.locator('iframe[src*="youtube.com"]')).toHaveCount(0)`.
- Vérifie aussi que `document.title` côté joueur ne contient pas le titre de la vidéo.
- Commit : `test(e2e): player view never leaks track metadata`

### T27 — Déploiement

**T27.1** Compte Pusher + variables

- Créer une app Pusher (cluster eu). Noter les 4 vars.
- Commit : `docs: add pusher setup instructions`

**T27.2** Déploiement Vercel

- `pnpm dlx vercel link` puis `vercel`. Configurer les env vars (server : `PUSHER_*`, public : `NEXT_PUBLIC_PUSHER_*`).
- Acceptation : URL `*.vercel.app` accessible, page d'accueil s'affiche.
- Commit : `docs: add vercel deployment instructions`

**T27.3** Smoke test prod

- Manuellement : créer salle, rejoindre depuis un 2e device/onglet, jouer 1 morceau, valider. Documenter dans `README.md`.
- Pas de commit code, juste validation manuelle. Marquer DONE dans le README ou `STATUS.md`.

---

## Phase 7 — Polish (optionnel)

### T28 — Responsive joueur

**T28.1** CSS mobile-first sur la vue joueur

- Bouton Buzz en plein viewport (`100dvh`), scores en sticky bottom.
- Tester sur Chrome DevTools mobile.
- Commit : `feat(ui): mobile-friendly player view`

### T29 — TTL salles

**T29.1** Cleanup périodique

- `setInterval` côté serveur (au montage du module DI) : toutes les 5 min, supprime les rooms dont `lastActivityAt > 30 min`. Mettre à jour `lastActivityAt` à chaque mutation dans le repo.
- Commit : `feat(infra): TTL cleanup for inactive rooms`

---

## Récapitulatif

| Phase                 | Sous-tâches | Commits attendus |
| --------------------- | ----------- | ---------------- |
| 0 — Squelette         | T1.1–T4.1   | 11               |
| 1 — Domaine           | T5.1–T10.3  | 19               |
| 2 — Application       | T11.1–T13.3 | 11               |
| 3 — Pusher + API      | T14.1–T15.8 | 11               |
| 4 — UI hôte           | T16.1–T20.4 | 9                |
| 5 — UI joueur         | T21.1–T23.2 | 6                |
| 6bis — Audio WebRTC   | T30.1–T36.2 | 11               |
| 6 — E2E + déploiement | T24.1–T27.3 | 7                |
| 7 — Polish            | T28.1–T29.1 | 2 (optionnels)   |
| **Total**             |             | **~87 commits**  |

Estimation : 12–18 sessions de travail focalisées (d'1 à 2 h chacune) pour la v1 sans le polish.
