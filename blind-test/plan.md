# Blind Test — Plan d'implémentation (v1.1)

> Réfère à `spec.md`. Décrit **le comment** : architecture, ports/adapters, pile technique, découpage en tâches.
> v1.1 ajoute le mode de réponse `input` (saisie texte) et le tchat de salle — voir §14.

## 1. Décisions techniques verrouillées

| Sujet          | Décision                                                                                   | Justification                                                  |
| -------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Stack          | Next.js 15 (App Router) + TypeScript strict                                                | Demandé. Full-stack avec API routes.                           |
| Layout code    | App Next.js unique, dossiers `src/domain` `src/application` `src/infrastructure` `src/app` | Clean Architecture sans surcoût monorepo.                      |
| Pub-sub        | Pusher Channels (free tier)                                                                | Presence channels natifs, SDK mature.                          |
| État salle     | Map en mémoire dans le process Next.js                                                     | Suffit pour usage perso ; trade-off survie redeploy assumé.    |
| Persistance    | LocalStorage (côté hôte uniquement) + export/import JSON                                   | Pas de DB v1.                                                  |
| Tests unit/int | Vitest                                                                                     | Rapide, ESM, intégré Vite.                                     |
| Tests E2E      | Playwright                                                                                 | Standard, multi-browser.                                       |
| Lint/format    | ESLint + Prettier (config Next + sane defaults)                                            | Standard.                                                      |
| CI             | GitHub Actions dès le début                                                                | Lint + typecheck + unit + int sur chaque push, E2E job séparé. |
| Méthode        | TDD strict sur le domaine                                                                  | Aligne avec objectif Clean Code.                               |
| Déploiement    | Vercel (free tier)                                                                         | Pré-câblé Next.js.                                             |
| Audio          | YouTube IFrame API côté hôte + capture `getDisplayMedia` + WebRTC P2P vers chaque joueur   | Décidé en spec §6.7. Anti-fuite des métadonnées vidéo.         |
| Signalisation  | Pusher presence channel + client events (déjà en place, pas d'infra supplémentaire)        | Free tier suffit (~10 msg/joueur au setup, P2P ensuite).       |
| ICE            | STUN public Google/Cloudflare ; TURN optionnel via env vars                                | Pas de coût v1, TURN configurable si NAT symétrique.           |

## 2. Architecture cible (Clean Architecture)

```
                 ┌────────────────────────────────────────────────┐
 Présentation    │  src/app/  (Next.js App Router : pages, API)   │
                 │  - composants UI (React Server/Client)         │
                 │  - routes API (POST /api/rooms, /buzz, …)      │
                 └───────────────┬────────────────────────────────┘
                                 │ dépend de
                                 ▼
                 ┌────────────────────────────────────────────────┐
 Application     │  src/application/                              │
                 │  - use cases (CreateRoom, JoinRoom, Buzz, …)   │
                 │  - ports (interfaces : RealtimeChannel, …)     │
                 └───────────────┬────────────────────────────────┘
                                 │ dépend de
                                 ▼
                 ┌────────────────────────────────────────────────┐
 Domaine         │  src/domain/                                   │
                 │  - agrégats Room, Round, Player                │
                 │  - règles R1…R8 (pures, testables, pas d'I/O) │
                 └────────────────────────────────────────────────┘
                                 ▲
                                 │ implémente les ports
                 ┌───────────────┴────────────────────────────────┐
 Infrastructure  │  src/infrastructure/                           │
                 │  - PusherRealtimeChannel                       │
                 │  - InMemoryRoomRepository                      │
                 │  - LocalStoragePlaylistRepository (côté client)│
                 │  - YouTubePlayerAdapter (côté client)          │
                 └────────────────────────────────────────────────┘
```

Règles invariantes :

- `domain` n'importe rien d'autre que TypeScript pur + ses propres modules.
- `application` n'importe que `domain` et ses propres ports. **Jamais** Next, Pusher, fetch, localStorage.
- `infrastructure` implémente les ports de `application`.
- `app` (Next) compose : il instancie les adapters et appelle les use cases.

Un test architectural simple (script Vitest qui parse les imports) garantit ces règles.

## 3. Arborescence

```
BlindTest/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # accueil (créer salle / rejoindre)
│   │   ├── host/
│   │   │   ├── playlists/page.tsx    # CRUD playlists (LocalStorage)
│   │   │   └── rooms/[code]/page.tsx # vue hôte d'une salle
│   │   ├── play/
│   │   │   └── [code]/page.tsx       # vue joueur d'une salle
│   │   └── api/
│   │       └── rooms/
│   │           ├── route.ts                    # POST  créer salle
│   │           ├── [code]/
│   │           │   ├── join/route.ts           # POST  rejoindre
│   │           │   ├── start/route.ts          # POST  démarrer partie
│   │           │   ├── play-track/route.ts     # POST  hôte joue le morceau N
│   │           │   ├── buzz/route.ts           # POST  joueur buzze
│   │           │   ├── validate/route.ts       # POST  hôte valide (correct/faux/demi/passer)
│   │           │   └── pusher-auth/route.ts    # POST  auth presence channel
│   ├── domain/
│   │   ├── room.ts                   # agrégat Room + factories
│   │   ├── round.ts                  # entité Round (état d'un tour)
│   │   ├── player.ts                 # value object Player
│   │   ├── playlist.ts               # value objects Playlist, Track
│   │   ├── room-code.ts              # generator + validator (alphabet sans O/0/I/1)
│   │   ├── playlist-import.ts        # parsers purs : natif + YouTube playlistItemListResponse
│   │   └── errors.ts                 # erreurs de domaine typées
│   ├── application/
│   │   ├── ports/
│   │   │   ├── room-repository.ts    # interface
│   │   │   ├── realtime-channel.ts   # interface (publish/presence)
│   │   │   ├── clock.ts              # interface (now(): number)
│   │   │   └── code-generator.ts     # interface
│   │   └── use-cases/
│   │       ├── create-room.ts
│   │       ├── join-room.ts
│   │       ├── start-game.ts
│   │       ├── play-track.ts
│   │       ├── buzz.ts
│   │       ├── validate-answer.ts
│   │       └── leave-room.ts
│   ├── infrastructure/
│   │   ├── realtime/
│   │   │   ├── pusher-channel.ts            # implémente RealtimeChannel (server)
│   │   │   └── pusher-client.ts             # côté navigateur
│   │   ├── persistence/
│   │   │   ├── in-memory-room-repository.ts
│   │   │   └── local-storage-playlist-repository.ts
│   │   ├── audio/
│   │   │   ├── youtube-player.ts            # wrapper IFrame API
│   │   │   ├── ice-config.ts                # construction de RTCConfiguration (STUN/TURN via env)
│   │   │   ├── audio-broadcaster.ts         # côté hôte : capture + N RTCPeerConnection (1/joueur)
│   │   │   └── audio-receiver.ts            # côté joueur : 1 RTCPeerConnection + <audio> caché
│   │   ├── clock/system-clock.ts
│   │   └── code/random-code-generator.ts
│   └── presentation/                       # composants React partagés (hooks UI, atoms)
│       ├── components/
│       └── hooks/
├── tests/
│   ├── unit/                         # domaine (Vitest)
│   ├── integration/                  # use cases avec adapters in-memory
│   ├── e2e/                          # Playwright
│   └── architecture/                 # test des frontières d'imports
├── .github/workflows/ci.yml
├── playwright.config.ts
├── vitest.config.ts
├── eslint.config.mjs
├── tsconfig.json
├── package.json
└── README.md
```

## 4. Ports (signatures clés)

```ts
// application/ports/room-repository.ts
export interface RoomRepository {
  save(room: Room): Promise<void>;
  findByCode(code: string): Promise<Room | null>;
  delete(code: string): Promise<void>;
}

// application/ports/realtime-channel.ts
export interface RealtimeChannel {
  publish(channel: string, event: string, payload: unknown): Promise<void>;
  authorizePresence(
    channel: string,
    socketId: string,
    userId: string,
    userInfo: unknown,
  ): { auth: string; channel_data?: string };
}

// application/ports/clock.ts
export interface Clock {
  now(): number;
}

// application/ports/code-generator.ts
export interface CodeGenerator {
  generate(): string;
}
```

## 5. Modélisation domaine (esquisse)

```ts
// domain/room.ts
export type RoomStatus = "lobby" | "playing" | "finished";

export class Room {
  // factory
  static create(code: string, hostId: string, playlist: Playlist, clock: Clock): Room;

  // commands (renvoient de nouveaux Room ou émettent des "events" interprétés par le use case)
  join(playerId: string, nickname: string): Room;
  start(): Room;
  playNextTrack(): Room;
  buzz(playerId: string, at: number): Room; // R1, R2, R3, R4
  validate(outcome: "correct" | "wrong" | "half" | "skip"): Room; // R5, R6
  leave(playerId: string): Room; // R7

  // invariants vérifiés à chaque transition
}
```

Les règles R1…R8 de la spec deviennent autant de **tests unitaires nommés** (`buzz_is_rejected_when_round_is_not_playing`, `wrong_answer_blocks_player_for_current_round`, etc.).

## 6. Flux temps réel (séquence d'un tour)

```
Hôte                     API Next.js              Pusher                   Joueur
  │  POST /play-track ───►│                          │                         │
  │                       │ Room.playNextTrack()     │                         │
  │                       │ publish "track:started"  ├─── presence ──────────►│ (UI: lecture en cours)
  │  (lance YT côté host) │                          │                         │
  │                                                 ◄──── POST /buzz ─────────│
  │                       │ Room.buzz(playerId, ts)  │                         │
  │                       │ (1er gagnant tranché)    │                         │
  │                       │ publish "buzz:taken"     ├──────────────────────►│ (UI: X a buzzé, audio pause)
  │ (UI hôte: validation) │                          │                         │
  │  POST /validate ─────►│                          │                         │
  │                       │ Room.validate("correct") │                         │
  │                       │ publish "round:resolved" ├──────────────────────►│ (UI: score MAJ)
```

Les joueurs **ne chargent pas YouTube** chez eux : ils reçoivent un flux audio WebRTC depuis l'hôte. Aucun titre, vidéo ou métadonnée ne fuite côté joueur (cf. §6.7 spec).

## 6bis. Flux WebRTC (mise en place du flux audio)

```
Hôte                     Pusher (signaling)       Joueur
  │  getDisplayMedia({audio:true})                  │
  │  (sélection d'onglet par l'utilisateur)         │
  │                                                 │
  │ subscribe presence-room-{code}                  │
  │                       presence:joined ◄─────────│ subscribe presence-room-{code}
  │ ◄─── pc_player := new RTCPeerConnection ───────►│ pc_host := new RTCPeerConnection
  │ pc_player.addTrack(audioTrack)                  │
  │ offer = pc_player.createOffer()                 │
  │ trigger "client-rtc-offer" ──────► pusher ────►│ pc_host.setRemoteDescription(offer)
  │                                                 │ answer = pc_host.createAnswer()
  │ pc_player.setRemoteDescription(answer) ◄────── trigger "client-rtc-answer"
  │ ── trigger "client-rtc-ice" ──── (échange continu jusqu'à connected) ────►│
  │                                                 │ pc_host.ontrack → <audio>.srcObject
  │                                                 │ → audio entendu par le joueur
```

- L'hôte ouvre **N** `RTCPeerConnection` (1 par joueur). Chaque PC ne contient que **l'audio** (pas de vidéo, pas de data channel).
- Les événements `client-rtc-offer`, `client-rtc-answer`, `client-rtc-ice` sont des **client events Pusher** envoyés directement de pair à pair via le presence channel `presence-room-{code}`. Les payloads incluent un champ `to: playerId` pour qu'un joueur n'agisse que sur les événements qui lui sont destinés.
- **Délai de grâce R9** : le use case `Buzz` rejette tout buzz reçu avant `track.startedAt + 500ms`. Implémenté côté domaine (pure : Round expose `startedAt` ; `Room.buzz(playerId, at)` lève `BuzzTooEarlyError` si `at - round.startedAt < 500`).

## 7. Tests

### 7.1 Unit (domaine, Vitest)

- Un fichier de tests par règle métier de la spec (R1…R8) + invariants des agrégats.
- Aucune dépendance hors `domain/`.
- Cible : ≥ 90 % de couverture sur `src/domain/`.

### 7.2 Intégration (use cases, Vitest)

- Use cases avec adapters in-memory (`InMemoryRoomRepository`, `FakeRealtimeChannel`, `FakeClock`).
- Vérifie que les use cases publient les bons événements et persistent les bons états.

### 7.3 Architecture (Vitest)

- Un test parse les imports de `src/domain/**/*.ts` et échoue s'il en trouve un vers `application`, `infrastructure` ou `app`.
- Idem pour `application/` qui ne doit pas dépendre de `infrastructure` ou `app`.

### 7.4 E2E (Playwright)

- 3 scénarios v1 : happy path complet sur 2 morceaux, buzz faux puis re-buzz d'un autre joueur, hôte "passe" un morceau.
- Tourne avec un Pusher de test (`soketi` en local Docker) pour ne pas dépendre du free tier en CI.
- **Test anti-fuite** (nouveau) : sur la vue joueur en cours de partie, vérifier que le DOM ne contient ni `videoId`, ni `expectedTitle`, ni `expectedArtist` du tour en cours. La vue YouTube n'est pas injectée côté joueur.

## 8. CI (GitHub Actions, dès la tâche 1)

`ci.yml` :

- job `quality` : `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:integration`, `pnpm test:arch`
- job `e2e` (séparé, plus lent) : `pnpm build`, `pnpm test:e2e` (avec soketi en service container)

## 9. Variables d'environnement

```
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=
NEXT_PUBLIC_YOUTUBE_API_KEY=    # optionnel (recherche, hors v1)
# WebRTC ICE — STUN par défaut si non défini (Google + Cloudflare publics) :
NEXT_PUBLIC_TURN_URL=           # optionnel (ex: turn:turn.example.com:3478)
NEXT_PUBLIC_TURN_USERNAME=      # optionnel
NEXT_PUBLIC_TURN_CREDENTIAL=    # optionnel
```

## 10. Découpage en tâches

Légende : _(D)_ domaine, _(A)_ application, _(I)_ infrastructure, _(P)_ présentation, _(X)_ transverse.
Chaque tâche doit se terminer par un commit, lint+typecheck+tests verts.

### Phase 0 — Squelette (1–2 sessions)

- **T1 (X)** : `pnpm init`, Next.js 15 + TS strict + ESLint + Prettier + Vitest + Playwright. Scripts npm. Page d'accueil placeholder.
- **T2 (X)** : Workflow GitHub Actions `ci.yml` (jobs `quality` + `e2e`).
- **T3 (X)** : Test architectural (Vitest) qui interdit les imports `domain → !domain` et `application → infrastructure|app`.
- **T4 (X)** : `README.md` minimal (run, test, déployer).

### Phase 1 — Domaine pur (TDD) (2–3 sessions)

- **T5 (D)** : `Player`, `Track`, `Playlist` (value objects). Tests d'invariants (pseudo non vide, longueur, etc.).
- **T6 (D)** : `RoomCode` — générateur + validateur (alphabet sans O/0/I/1, longueur 6). Tests.
- **T6bis (D)** : `playlist-import.ts` — fonctions pures `detectFormat(json)`, `parseNativePlaylist(json)`, `parseYouTubePlaylist(json)`. Heuristique `Artiste - Titre`, nettoyage des suffixes `(Official Video)` etc., tri par `snippet.position`, filtrage des items non-jouables. Renvoie `{ playlist, imported, skipped }`. Tests TDD couvrant tous les cas (cf. `spec.md` US-06) à partir du fichier `playlist.json` de la racine utilisé comme fixture.
- **T7 (D)** : `Room.create` + `join` + `leave`. Tests : 8 max, pseudo unique, host non joueur (R8).
- **T8 (D)** : `Room.start` + `playNextTrack` + statuts. Tests transitions valides/invalides.
- **T9 (D)** : `Round` + `Room.buzz`. Tests R1, R2, R3 (déterminisme via timestamp d'entrée), R4.
- **T10 (D)** : `Room.validate` (correct/half/wrong/skip) + scoring. Tests R5, R6, et fin de playlist → status "finished".

### Phase 2 — Application + adapters in-memory (1–2 sessions)

- **T11 (A)** : Ports (`RoomRepository`, `RealtimeChannel`, `Clock`, `CodeGenerator`).
- **T12 (A)** : Use cases `CreateRoom`, `JoinRoom`, `StartGame`, `PlayTrack`, `Buzz`, `ValidateAnswer`, `LeaveRoom`. Tests d'intégration avec adapters in-memory + `FakeRealtimeChannel` qui enregistre les événements publiés.
- **T13 (I)** : `InMemoryRoomRepository` (process-wide singleton), `SystemClock`, `RandomCodeGenerator`.

### Phase 3 — Temps réel + API (1–2 sessions)

- **T14 (I)** : `PusherRealtimeChannel` (server SDK) + `pusher-client.ts`.
- **T15 (P)** : Routes API `/api/rooms`, `/api/rooms/[code]/{join,start,play-track,buzz,validate,pusher-auth}`. Délégation pure aux use cases. Tests d'intégration HTTP (supertest ou fetch contre Next test server).

### Phase 4 — UI hôte (2–3 sessions)

- **T16 (P)** : Page `/` avec deux boutons (créer / rejoindre).
- **T17 (P)** : Page `/host/playlists` — CRUD LocalStorage + import/export JSON (détection auto natif vs YouTube via `playlist-import.ts`). Composant `<TrackForm>`. Récap `"X / Y morceaux importés"` après un import YouTube.
- **T18 (I)** : `LocalStoragePlaylistRepository` (côté client uniquement).
- **T19 (P)** : Page `/host/rooms/[code]` — lobby (liste joueurs via presence Pusher) + bouton démarrer.
- **T20 (P)** : Vue partie hôte — lecteur YouTube embed, bouton "play next", panneau validation (Correct / Faux / Demi / Passer), réponse attendue affichée.

### Phase 5 — UI joueur (1–2 sessions)

- **T21 (P)** : Page `/play/[code]` — saisie pseudo + lobby (liste joueurs, score).
- **T22 (P)** : Vue partie joueur — bouton Buzz géant, état du tour, score.
- **T23 (P)** : Reconnexion : si pseudo + code identiques, on récupère la session côté serveur.

### Phase 6 — E2E + finitions (1 session)

- **T24 (X)** : Playwright happy path (2 navigateurs : hôte + 1 joueur).
- **T25 (X)** : Playwright buzz faux puis re-buzz (3 navigateurs).
- **T26 (X)** : Playwright "passer le tour".
- **T27 (X)** : Déploiement Vercel + variables d'env. Vérification fumée en prod.

### Phase 6bis — Diffusion audio WebRTC (2 sessions)

- **T30 (D)** : Étendre `Round` (`startedAt`) + règle R9 (`BuzzTooEarlyError` si `at - startedAt < 500`). Tests TDD.
- **T31 (D/A)** : Use case `PlayTrack` met `startedAt = clock.now()` ; `Buzz` propage R9.
- **T32 (I)** : `ice-config.ts` — construit `RTCConfiguration` depuis `process.env` (STUN par défaut, TURN si défini).
- **T33 (I)** : `audio-broadcaster.ts` (côté hôte) — capture `getDisplayMedia` audio-only, gère N `RTCPeerConnection`, envoie offer + ICE via Pusher client events, expose `connect(playerId)`, `disconnect(playerId)`, `stop()`. Aucun import `app/`.
- **T34 (I)** : `audio-receiver.ts` (côté joueur) — souscrit aux client events ciblés (`to === me`), reçoit le `MediaStream`, branche un `<audio autoplay>` caché. Émet `onState(state)`.
- **T35 (P)** : `useAudioBroadcaster` (hook hôte) + indicateur d'état par joueur dans la vue hôte.
- **T36 (P)** : `useAudioReceiver` (hook joueur) + slider volume + bouton "Réessayer" + état `connecting | connected | failed`. **Aucune métadonnée vidéo n'est rendue côté joueur** (le composant `<YouTubePlayer>` n'est jamais monté côté joueur).

### Phase 7 — Polish (optionnel)

- **T28 (P)** : Petit responsive mobile pour les joueurs.
- **T29 (X)** : Cleanup automatique des salles inactives (TTL 30 min via setInterval serveur).

## 11. Risques & mitigations

| Risque                                              | Impact                        | Mitigation                                                                                     |
| --------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| Free tier Pusher dépassé                            | Coupure pendant une partie    | Côté UI, fallback "réessayer" + log. Reste largement sous le seuil pour usage perso.           |
| Redeploy Vercel pendant une partie                  | Salles perdues (état mémoire) | Acceptable v1. Communiquer à l'hôte. Migration Redis = T29 si nécessaire.                      |
| YouTube bloque l'embed (vidéo "ne peut être lue")   | Morceau injouable             | Bouton "Passer" déjà prévu (US-37).                                                            |
| Triche client (rejouer le buzz)                     | Faussage du jeu               | Hors-scope v1 (usage perso). Le serveur arbitre, c'est suffisant.                              |
| Latence réseau sur le buzz                          | Avantage au mieux connecté    | Inhérent au temps réel. Communiqué dans le README.                                             |
| `getDisplayMedia` non supporté ou refusé par l'hôte | Pas d'audio diffusé           | Bandeau d'avertissement côté UI hôte ; partie jouable mais sans audio P2P (joueurs prévenus).  |
| NAT symétrique sur un joueur (échec ICE)            | Joueur sans audio             | STUN par défaut + TURN configurable via env vars. Bouton "Réessayer" côté joueur.              |
| Fuite des métadonnées vidéo dans le DOM joueur      | Triche                        | Le composant `<YouTubePlayer>` est rendu **uniquement** sur la page hôte. Test E2E anti-fuite. |

## 12. Definition of Done par tâche

Une tâche est terminée quand :

1. Code écrit selon ses contraintes de couche.
2. Tests passent localement (`pnpm test`).
3. `pnpm lint` et `pnpm typecheck` verts.
4. CI verte sur le push.
5. Pour une feature visible : démo manuelle dans le navigateur réussie.

## 13. Ordre d'attaque recommandé

T1 → T2 → T3 → T5 → T6 → T6bis → T7 → T8 → T9 → T10 → T11 → T12 → T13 → T14 → T15 → T16 → T19 → T20 → T21 → T22 → T17 → T18 → T23 → **T30 → T31 → T32 → T33 → T34 → T35 → T36** → T24 → T25 → T26 → T27.

(`T6bis` est placé tôt en Phase 1 car c'est du domaine pur — utile pour développer sans se bloquer sur la saisie manuelle de tracks. La consommation par l'UI se fait plus tard en T17.)

(Les playlists CRUD T17/T18 sont volontairement repoussées : on peut tester le moteur de jeu avec une playlist hardcodée d'abord.)

---

## 14. v1.1 — Mode `input` (saisie texte) + Tchat

### 14.1 Décisions techniques v1.1

| Sujet                | Décision                                                                                          | Justification                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Auto-validation      | Service domaine pur (`src/domain/answer-matcher.ts`)                                              | Règle métier R11 → reste pure, testable, sans I/O. Pas de port nécessaire.     |
| Algo de matching     | Normalisation (lowercase + suppression diacritiques + suppression non-alphanumériques + trim) puis Levenshtein ≤ 2 | Couvre "Daft Punk" vs "daft-punk", "beatlès" vs "Beatles", typos courants.    |
| Modélisation tchat   | Agrégat dédié `Chat` (par `roomCode`)                                                             | Découplage propre du jeu, évolution future possible.                           |
| Persistance tchat    | In-memory côté serveur, dans le même repository pattern que `Room`                                | Cohérent avec v1, éphémère (US-86). Liée au cycle de vie de la salle.          |
| Routes API           | Dédiées sous `/api/rooms/[code]/{submit-answer,set-mode,chat,chat-toggle}`                        | Aligne avec le style REST existant. Plus simple à tester via fetch.            |
| Diffusion submissions| Hôte = canal privé (clair) ; joueurs = canal partagé (masqué `•••`)                              | Anti-fuite (US-65, §6.8). Deux events Pusher distincts au moment d'une soumission. |
| Mode de salle        | Champ `mode: "buzz" \| "input"` figé sur Room après `start` (R12)                                 | Vérifié dans le domaine, refusé sinon (`InvalidModeChangeError`).              |

### 14.2 Architecture cible (delta v1.1)

Le **domaine** gagne :

- `src/domain/answer-matcher.ts` — fonctions pures `normalize`, `levenshtein`, `matchAnswer({ submittedTitle, submittedArtist }, { expectedTitle, expectedArtist }) -> { titleOk, artistOk, outcome: "correct"|"half"|"wrong" }`.
- `src/domain/chat.ts` — agrégat `Chat { roomCode, messages: ChatMessage[], isOpen: boolean, lastSentAt: Map<playerId, ts> }` ; commands `post(authorId, text, at)` (R13), `toggle(by)`, `clearAfterRoomDestroyed()`.
- `src/domain/round.ts` (étendu) — `submissions: Map<playerId, Submission>`, méthodes `submitAnswer(playerId, submission, at)` (R10) et `resolveByInput(matcher, expectedTrack)` qui renvoie le scoring de tous les joueurs (`Map<playerId, "correct"|"half"|"wrong">`).
- `src/domain/room.ts` (étendu) — `mode: "buzz" | "input"`, `setMode(mode)` rejette si pas en `lobby` (R12), `submitAnswer(...)` délègue à Round, `resolveInputRound()` applique les scores via R11.
- `src/domain/errors.ts` (étendu) — `AlreadySubmittedError`, `InvalidModeChangeError`, `ChatClosedError`, `ChatCooldownError`, `ChatTooLongError`.

L'**application** gagne :

- Use cases : `SubmitAnswer`, `ResolveInputRound` (équivalent input de `ValidateAnswer`), `OverrideAnswerOutcome`, `SetRoomMode`, `PostChatMessage`, `ToggleChat`.
- Port : `ChatRepository { save(chat), findByRoomCode(code), delete(code) }`.
- Réutilise les ports existants `RoomRepository`, `RealtimeChannel`, `Clock`.

L'**infrastructure** gagne :

- `InMemoryChatRepository` (même pattern que `InMemoryRoomRepository`).
- Pas de nouvel adapter pour `AnswerMatcher` (c'est du domaine pur).
- `PusherRealtimeChannel` voit s'ajouter de nouveaux noms d'events : `submission:received` (à tous, masqué), `submission:received:host` (à l'hôte, en clair, via channel privé), `round:resolved:input` (révèle saisies + scores), `chat:message`, `chat:toggled`, `room:mode-changed`.

La **présentation** gagne :

- Routes API : `/api/rooms/[code]/submit-answer`, `/set-mode`, `/chat`, `/chat-toggle`.
- UI hôte : sélecteur de mode dans le lobby ; en mode `input`, panneau "soumissions du tour" (liste live, avec override par joueur) au lieu du panneau buzz/validation.
- UI joueur : en mode `input`, formulaire titre + auteur à la place du bouton Buzz ; statut "X a répondu" pour les autres ; révélation à la fin du tour.
- UI partagée : composant `<ChatPanel>` (liste messages + input + état "fermé") sur le lobby et la vue partie pour hôte et joueurs.

### 14.3 Flux temps réel : tour en mode `input`

```
Hôte                     API                       Pusher                       Joueur
  │  POST /play-track ───►│                          │                             │
  │                       │ Room.playNextTrack(input)│                             │
  │                       │ publish "track:started"  ├── presence ──────────────►│ (UI: formulaire ouvert)
  │                                                  ◄── POST /submit-answer ─────│
  │                       │ Room.submitAnswer(...)   │                             │
  │                       │ publish                  │                             │
  │                       │   "submission:received"  ├── presence ──────────────►│ (UI: "Alice a répondu •••")
  │                       │   "submission:received   ├── private-host ──────────►│ (Hôte: contenu en clair)
  │                       │    :host"                │                             │
  │  (tous ont soumis OU  │                          │                             │
  │   hôte clique "Fin")  │                          │                             │
  │  POST /resolve-input ►│                          │                             │
  │                       │ Room.resolveInputRound() │                             │
  │                       │ → AnswerMatcher.match(*) │                             │
  │                       │ publish                  │                             │
  │                       │   "round:resolved:input" ├── presence ──────────────►│ (UI: saisies dévoilées + scores)
  │ (override possible) ──►│ POST /override          │                             │
  │                       │ publish "score:adjusted" ├──────────────────────────►│
```

Anti-fuite : le canal `private-host-{code}` n'est souscrit que par l'hôte (auth distincte de presence). Les joueurs sur `presence-room-{code}` ne reçoivent que la version masquée.

### 14.4 Flux temps réel : tchat

```
Joueur                    API                       Pusher                       Tous
  │  POST /chat ─────────►│                          │                             │
  │                       │ Chat.post(playerId, txt) │                             │
  │                       │ (R13: long, cooldown,    │                             │
  │                       │  ouvert)                 │                             │
  │                       │ publish "chat:message"   ├── presence ──────────────►│ (UI: nouveau message)
  │                                                                                 │
Hôte (toggle) ────────────►│ POST /chat-toggle       │                             │
  │                       │ Chat.toggle(host)        │                             │
  │                       │ publish "chat:toggled"   ├── presence ──────────────►│ (UI: état tchat MAJ)
```

Historique tchat : envoyé en réponse de `POST /api/rooms/[code]/join` (déjà retourne l'état de la salle ; on enrichit avec `chat: ChatMessage[]`).

### 14.5 Tests v1.1

#### Domaine (Vitest)

- `answer-matcher.test.ts` :
  - normalize : "Daft Punk!" === "daft punk", "Béyoncé" === "beyonce", "  Air  " === "air".
  - levenshtein : 0 sur égalité, 1 sur 1 typo, 2 sur 2 typos, 3 sur 3 typos.
  - matchAnswer : couvre R11 (correct, half titre seul, half artiste seul, wrong, champ manquant côté track, champ manquant côté soumission).
- `chat.test.ts` : R13 (vide rejeté, > 200 caractères rejeté, cooldown 500 ms rejeté, fermé → seul l'hôte peut poster).
- `round.test.ts` (delta) : R10 (deuxième soumission rejetée), submitter manquant n'a aucun outcome.
- `room.test.ts` (delta) : R12 (changement de mode après start refusé), `resolveInputRound` produit les bons scores.

#### Intégration (Vitest, use cases)

- `submit-answer.test.ts` : publication des deux events (masqué + privé hôte) via `FakeRealtimeChannel`.
- `resolve-input-round.test.ts` : applique scoring puis publish `round:resolved:input` avec saisies en clair.
- `override-answer-outcome.test.ts` : ajuste le score d'un joueur, publish `score:adjusted`.
- `post-chat-message.test.ts` : R13 + publish `chat:message`.
- `toggle-chat.test.ts` : seul l'hôte autorisé.

#### Architecture

- Aucune nouvelle règle : `answer-matcher` doit rester dans `domain/`, vérifié par le test existant.

#### E2E (Playwright)

- Scénario `input-happy-path` : hôte mode input + 2 joueurs, 1 morceau, joueur A tape titre+artiste exacts → 1pt, joueur B tape titre seul → 0,5pt.
- Scénario `input-anti-leak` : pendant la lecture en mode input, le DOM joueur ne contient ni la saisie de l'autre joueur en clair, ni l'attendu, ni `youtubeId`. Vérification post-`round:resolved:input` : tout est révélé.
- Scénario `chat` : 2 joueurs s'échangent des messages, l'historique est visible pour un 3e joueur arrivant en cours.
- Scénario `chat-closed` : hôte ferme le tchat → joueurs ne peuvent plus poster, l'hôte si.

### 14.6 Variables d'environnement v1.1

Aucune nouvelle. Réutilise `PUSHER_*` existant (un canal privé `private-host-{code}` est ajouté ; l'auth Pusher existante (`/api/rooms/[code]/pusher-auth`) gère les deux types de canaux).

### 14.7 Ordre d'attaque v1.1 recommandé

T40 → T41 → T42 → T43 → T44 → T45 → T46 → T47 → T48 → T49 → T50 → T51 → T52 → T53.

(Détaillé dans `tasks.md` Phase 8.)

### 14.8 Risques v1.1 & mitigations

| Risque                                              | Impact                          | Mitigation                                                                                            |
| --------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Tolérance Levenshtein trop laxe                     | Réponses approximatives validées | Seuil fixé à 2 ; questions ouvertes spec §8.7. Override hôte toujours disponible.                     |
| Tolérance Levenshtein trop stricte                  | Réponses justes refusées        | Idem ; override hôte. Logs côté hôte des `wrong` proches (distance 3) pour calibrer en v1.2.          |
| Fuite des saisies adverses dans le DOM joueur       | Triche                          | Canal `private-host-{code}` séparé. Test E2E anti-leak (T52). Le payload `submission:received` n'a que `{ playerId, hasTitle, hasArtist }`, jamais le contenu. |
| Tchat utilisé pour répondre malgré tout             | Contournement du mode input     | US-85 : hôte peut fermer le tchat pendant les tours. Documenté dans le README/UX.                    |
| Spam tchat                                          | UX dégradée                     | Cooldown 500 ms (R13) + longueur max 200. Suffisant pour usage privé.                                 |
| Joueur déconnecté pendant son tour input            | Soumission perdue               | Aucune ; comportement = US-69 (0 pt). Cohérent avec le buzz (un joueur déconnecté ne buzze pas non plus). |
