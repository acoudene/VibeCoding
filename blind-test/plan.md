# Blind Test — Plan d'implémentation (v1)

> Réfère à `spec.md`. Décrit **le comment** : architecture, ports/adapters, pile technique, découpage en tâches.

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
| Audio          | YouTube IFrame API, hôte seul diffuse                                                      | Décidé en spec §8.1.                                           |

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
│   │   │   └── youtube-player.ts            # wrapper IFrame API
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

Les joueurs **n'écoutent pas YouTube** chez eux ; seul l'hôte diffuse (Discord/IRL). Cela élimine la synchronisation audio multi-clients, qui serait un puits sans fond.

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
- **T17 (P)** : Page `/host/playlists` — CRUD LocalStorage + import/export JSON. Composant `<TrackForm>`.
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

### Phase 7 — Polish (optionnel)

- **T28 (P)** : Petit responsive mobile pour les joueurs.
- **T29 (X)** : Cleanup automatique des salles inactives (TTL 30 min via setInterval serveur).

## 11. Risques & mitigations

| Risque                                            | Impact                        | Mitigation                                                                           |
| ------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| Free tier Pusher dépassé                          | Coupure pendant une partie    | Côté UI, fallback "réessayer" + log. Reste largement sous le seuil pour usage perso. |
| Redeploy Vercel pendant une partie                | Salles perdues (état mémoire) | Acceptable v1. Communiquer à l'hôte. Migration Redis = T29 si nécessaire.            |
| YouTube bloque l'embed (vidéo "ne peut être lue") | Morceau injouable             | Bouton "Passer" déjà prévu (US-37).                                                  |
| Triche client (rejouer le buzz)                   | Faussage du jeu               | Hors-scope v1 (usage perso). Le serveur arbitre, c'est suffisant.                    |
| Latence réseau sur le buzz                        | Avantage au mieux connecté    | Inhérent au temps réel. Communiqué dans le README.                                   |

## 12. Definition of Done par tâche

Une tâche est terminée quand :

1. Code écrit selon ses contraintes de couche.
2. Tests passent localement (`pnpm test`).
3. `pnpm lint` et `pnpm typecheck` verts.
4. CI verte sur le push.
5. Pour une feature visible : démo manuelle dans le navigateur réussie.

## 13. Ordre d'attaque recommandé

T1 → T2 → T3 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13 → T14 → T15 → T16 → T19 → T20 → T21 → T22 → T17 → T18 → T23 → T24 → T25 → T26 → T27.

(Les playlists CRUD T17/T18 sont volontairement repoussées : on peut tester le moteur de jeu avec une playlist hardcodée d'abord.)
