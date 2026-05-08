# Blind Test — Specification (v1.1)

> Style: spec-kit `/specify`. Ce document décrit **le quoi**, pas le comment.
> Les choix d'implémentation détaillés sont du ressort de `/plan`.
> v1.1 ajoute : mode de réponse "saisie texte" (titre + auteur) et tchat libre par salle (§4.7, §4.8, §6.8).

## 1. Résumé

Application web de blind test musical multi-joueurs en ligne, à destination d'un usage privé entre amis. Un hôte crée une salle, partage un code court ou un lien, jusqu'à 8 joueurs rejoignent et buzzent en temps réel pour reconnaître les morceaux d'une playlist construite par l'hôte. La source audio est YouTube. La validation des réponses est faite vocalement (Discord/IRL) et l'hôte tranche depuis son interface.

## 2. Contexte et objectifs

- **Public visé** : amis du créateur, parties à distance.
- **Objectif primaire** : jouer ensemble, sans friction (pas de compte).
- **Objectif secondaire** : projet d'apprentissage du _vibe coding_ avec exigence de qualité Clean Code.
- **Hors-objectif v1** : monétisation, viralité, multi-tenant, modération, contenu pré-livré.

## 3. Personas

- **Hôte** : crée la playlist, lance la salle, anime la partie, valide les réponses.
- **Joueur** : rejoint via code/lien, buzze, écoute, donne sa réponse à voix haute.

## 4. User stories (v1)

### 4.1 Gestion des playlists (hôte)

- **US-01** En tant qu'hôte, je peux créer une playlist en y ajoutant des morceaux (titre attendu, artiste attendu, URL ou ID YouTube, optionnel : timestamp de départ).
- **US-02** En tant qu'hôte, je peux modifier ou supprimer un morceau.
- **US-03** En tant qu'hôte, je peux dupliquer une playlist pour en faire une variante.
- **US-04** En tant qu'hôte, je peux exporter une playlist au format JSON et en importer une.
- **US-05** Mes playlists persistent entre mes sessions sur le même navigateur (LocalStorage v1).
- **US-06** En tant qu'hôte, je peux importer une playlist au **format YouTube Data API v3** (`playlistItemListResponse`, c.-à-d. l'objet retourné par `GET /youtube/v3/playlistItems`, dont un exemple est fourni dans `playlist.json` à la racine). L'app détecte automatiquement le format du fichier déposé (natif ou YouTube) ; aucune sélection manuelle n'est demandée à l'hôte.

  **Mapping YouTube → Track :**
  - `snippet.resourceId.videoId` → `youtubeId`.
  - `snippet.title` est interprété par l'heuristique **"Artiste - Titre"** : si la chaîne contient un séparateur `-` (espace-tiret-espace), la portion avant devient `expectedArtist` et celle après devient `expectedTitle`. Les suffixes parasites entre parenthèses ou crochets (`(Official Video)`, `[CLIP OFFICIEL]`, `(Audio)`, `(Lyrics)`, `[HD]`, `(Official Music Video)`, etc.) sont retirés du titre.
  - Si `snippet.title` ne contient **pas** de séparateur `-`, alors : `expectedTitle` = `snippet.title` nettoyé, et `expectedArtist` = `snippet.videoOwnerChannelTitle` (fallback).
  - `startSeconds` n'est pas fourni par l'API YouTube : laissé indéfini (départ à 0).
  - Le champ `snippet.position` détermine l'ordre des tracks dans la playlist importée ; à défaut, l'ordre du tableau `items` est conservé.
  - Le nom de la playlist importée n'est pas présent dans `playlistItemListResponse` (qui ne décrit que les items) : l'app génère un nom par défaut (`Import YouTube — <date>`) que l'hôte peut renommer.

  **Items non-jouables :** un item est considéré non-jouable si `snippet.resourceId.videoId` est absent / vide, ou si `snippet.title` ∈ {`Private video`, `Deleted video`, `[Private video]`, `[Deleted video]`}. Ces items sont **écartés silencieusement** lors de l'import. L'UI affiche un message récapitulatif `"X / Y morceaux importés"` (X = importés, Y = total dans le fichier source).

  **Validation du fichier :** rejet si le JSON ne contient pas `kind: "youtube#playlistItemListResponse"` au niveau racine **ni** la structure du format natif. Un message d'erreur explicite l'indique. La détection se fait sur ces deux marqueurs uniquement (pas d'inférence floue).

### 4.2 Création / cycle de vie d'une salle

- **US-10** En tant qu'hôte, je peux créer une salle à partir d'une playlist. La salle reçoit un code court à 6 caractères (alphanumérique non ambigu, ex. exclu O/0/I/1) et une URL partageable qui encode ce code.
- **US-11** En tant qu'hôte, je peux ouvrir/fermer la salle aux nouveaux entrants à tout moment.
- **US-12** Une salle est éphémère : à la fin de la partie (ou après un timeout d'inactivité raisonnable), elle est détruite avec ses scores.
- **US-13** Une salle accepte au maximum 8 joueurs simultanés (hôte non compté).

### 4.3 Rejoindre une partie (joueur)

- **US-20** En tant que joueur, je rejoins via un code à 6 caractères ou via un lien direct.
- **US-21** Je saisis un pseudo (validation : non vide, unique dans la salle, ≤ 20 caractères).
- **US-22** Je vois la liste des autres joueurs et l'état de la salle (lobby, en cours, terminée).
- **US-23** En cas de déconnexion brève, je peux rejoindre la salle avec le même pseudo et reprendre mon score.

### 4.4 Déroulé d'une manche

- **US-30** L'hôte démarre la partie depuis le lobby. La salle passe à l'état "en cours".
- **US-31** Pour chaque morceau, l'hôte déclenche la lecture. Tous les joueurs entendent l'audio simultanément (à la latence YouTube près).
- **US-32** Chaque joueur dispose d'un bouton "Buzz" très visible. Le premier buzz remporte la main ; l'horodatage fait foi côté serveur de temps réel.
- **US-33** Quand un joueur a buzzé, son nom est affiché à tous, l'audio est mis en pause automatiquement, et l'hôte voit apparaître les boutons de validation : **Correct**, **Faux**, **Demi-point** (titre OU artiste seulement), **Passer le tour**.
- **US-34** Si la réponse est **Correcte** : le joueur gagne 1 point, le tour est terminé.
- **US-35** Si la réponse est un **Demi-point** : le joueur gagne 0,5 point, le tour est terminé.
- **US-36** Si la réponse est **Fausse** : le joueur fautif est bloqué pour ce tour ; la lecture reprend ; les autres joueurs peuvent re-buzzer. Le tour se poursuit jusqu'à ce qu'un joueur trouve, que tous soient bloqués, ou que l'hôte clique "Passer".
- **US-37** "Passer le tour" : aucun point, on passe au morceau suivant. L'hôte dévoile la réponse correcte avant de passer.
- **US-38** À la fin de la playlist, la salle affiche un classement final.

### 4.5 Visibilité et état

- **US-40** Tous les participants voient en permanence : leur pseudo, le score de chacun, le numéro du morceau en cours (ex. "5 / 20"), l'état (lecture/buzz/validation/entre-tours).
- **US-41** L'hôte voit en plus : la réponse attendue (titre + artiste) du morceau en cours, les contrôles de lecture, les contrôles de validation.
- **US-42** Les joueurs ne voient **jamais** la réponse attendue avant qu'elle ne soit dévoilée.

### 4.7 Mode de réponse de la partie (buzz vs saisie texte)

- **US-60** En tant qu'hôte, au moment de créer la salle (ou au plus tard dans le lobby, avant `start`), je choisis le **mode de réponse** de la partie :
  - **`buzz`** (existant, comportement par défaut) : les joueurs buzzent, l'arbitrage est vocal/manuel par l'hôte (cf. §4.4).
  - **`input`** (nouveau) : les joueurs saisissent leur réponse (titre + auteur) au clavier. L'auto-validation tranche, l'hôte peut overrider.
- **US-61** Le mode est figé pour toute la durée de la partie : il ne peut pas changer une fois la partie démarrée. L'hôte peut le modifier tant que la salle est en `lobby`.
- **US-62** Le mode courant est visible de tous les participants dans le lobby et pendant la partie (badge "Mode : Buzz" / "Mode : Saisie").

### 4.7bis Déroulé d'une manche en mode `input`

- **US-63** L'hôte démarre la lecture d'un morceau (US-31). À ce moment, chaque joueur voit apparaître un **formulaire de soumission** avec deux champs : `Titre` et `Auteur` (chacun optionnel individuellement, mais au moins un des deux doit être renseigné pour soumettre).
- **US-64** Chaque joueur peut soumettre **une seule réponse** par tour. Une fois soumise, le formulaire est verrouillé pour ce joueur jusqu'à la fin du tour.
- **US-65** Les autres joueurs voient en temps réel **qu'un joueur a soumis** (ex. "Alice a répondu") mais le **contenu de sa saisie est masqué** (`•••`) jusqu'à la résolution du tour. L'hôte voit le contenu de chaque soumission au fil de l'eau.
- **US-66** Le tour se termine sur le premier des événements suivants :
  1. Tous les joueurs (hors hôte) ont soumis leur réponse.
  2. L'hôte clique "Fin du tour" (équivalent du "Passer" en mode buzz).
  3. L'hôte clique "Passer" (sans réponse correcte attendue).
- **US-67** À la fin du tour, l'app calcule le score de chaque joueur via **auto-validation** (voir §4.7ter) puis affiche à tous les joueurs : la réponse attendue (titre + artiste), les soumissions complètes (rendues lisibles), et les points attribués pour ce tour.
- **US-68** L'hôte peut **overrider** chaque résultat individuel avant de passer au tour suivant : un panneau "ajuster" lui permet de transformer un résultat `correct` ↔ `half` ↔ `wrong` pour un joueur donné. Le scoring final reflète l'override.
- **US-69** Si un joueur n'a pas soumis avant la fin du tour, il marque 0 point pour ce tour (ni faux ni demi : non-réponse).

### 4.7ter Auto-validation des saisies (mode `input`)

- **US-70** L'auto-validation compare la saisie du joueur (champs `title`, `artist`) à la réponse attendue (`expectedTitle`, `expectedArtist`) après une **normalisation** :
  - mise en minuscules,
  - suppression des accents (NFD + retrait des marques diacritiques),
  - suppression de la ponctuation et des caractères non-alphanumériques (espaces compactés),
  - trim.
- **US-71** Une comparaison de chaîne accepte une **distance de Levenshtein ≤ 2** entre la saisie normalisée et l'attendu normalisé (tolérance fautes de frappe). Au-delà, c'est faux.
- **US-72** Scoring (synthèse, voir aussi R10) :
  - Titre OK **et** Auteur OK → `correct`, **1 pt**.
  - Titre OK **ou** Auteur OK (un seul des deux) → `half`, **0,5 pt**.
  - Aucun des deux OK → `wrong`, **0 pt**.
  - Champ non renseigné par le joueur → traité comme "non OK" pour ce champ (donc max 0,5 pt si un seul champ rempli et juste).
- **US-73** Quand un seul champ est attendu côté track (cas exceptionnel : artiste vide après import), l'auto-validation se fait sur le champ disponible uniquement, et `correct` = ce champ correct.

### 4.8 Tchat de salle

- **US-80** Toute salle (en `lobby`, `playing` ou `finished`) dispose d'un **tchat** visible de tous les participants (hôte et joueurs). Le tchat sert à la conversation (papoter, hypothèses, plaisanteries) et **n'est pas le canal de réponse** — il ne déclenche aucune validation.
- **US-81** Tout participant connecté peut envoyer un message dans le tchat. Le message est affiché à tous les participants connectés en temps réel, avec : auteur (pseudo, ou "Hôte"), horodatage, contenu.
- **US-82** Un joueur qui rejoint la salle reçoit l'**historique du tchat depuis le début de la salle** (mémoire serveur) afin de ne pas perdre le contexte de la conversation.
- **US-83** Validation à l'envoi : message non vide, longueur ≤ 200 caractères. Au-delà, l'UI bloque l'envoi.
- **US-84** Un cooldown anti-spam de **500 ms par joueur** est appliqué côté serveur ; un message envoyé pendant le cooldown est rejeté avec un message d'erreur dans l'UI émettrice (les autres ne sont pas notifiés).
- **US-85** L'hôte peut **désactiver le tchat** depuis son panneau, soit globalement (toggle "Tchat ouvert / fermé"), soit pour un seul tour. Quand le tchat est fermé, seul l'hôte peut écrire ; les joueurs voient un état "Tchat fermé par l'hôte" et leur zone de saisie est désactivée.
- **US-86** Le tchat est **éphémère** : son contenu vit en mémoire serveur, lié à la salle, et est **détruit avec la salle** (fin de partie ou TTL d'inactivité). Aucune persistance disque.
- **US-87** **Anti-fuite côté joueur** : le tchat ne contient à aucun moment, dans son flux serveur → joueur, la réponse attendue (`expectedTitle`, `expectedArtist`, `youtubeId`). L'UI hôte peut taper ces termes dans le tchat (responsabilité de l'hôte), mais le système ne les y injecte jamais automatiquement (ex : pas de "réponse révélée" auto-postée — la révélation a son propre canal `round:resolved`).

### 4.6 Diffusion audio aux joueurs

- **US-50** En tant qu'hôte, au démarrage de la partie, j'autorise une fois le **partage audio de l'onglet** YouTube (via `getDisplayMedia`). Le navigateur affiche un bandeau de partage que je ne peux pas masquer (limitation imposée par le navigateur).
- **US-51** En tant que joueur, je reçois automatiquement le flux audio diffusé par l'hôte dès que je rejoins la salle (ou dès que l'hôte démarre la partie si je suis arrivé avant). Aucun titre, aucune image et aucune métadonnée de la vidéo ne sont visibles dans mon interface ou dans le DOM de la page.
- **US-52** En tant que joueur, je peux régler le volume du flux audio reçu (slider local, ne modifie pas la diffusion pour les autres).
- **US-53** En cas d'échec de la connexion audio P2P (≥ 10 s sans flux), l'UI me l'indique clairement et je peux demander une **reconnexion manuelle** (bouton "Réessayer"). Cela ne bloque pas mon bouton Buzz : la partie continue, l'hôte peut décider d'arbitrer autrement.
- **US-54** En tant qu'hôte, je vois en permanence l'état de connexion audio de chaque joueur (`connecté` / `connexion…` / `échec`).

## 5. Règles métier (synthèse pour le domaine)

| Règle | Énoncé                                                                                                                                  |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------- |
| R1    | Un buzz n'est valide que pendant l'état "lecture" du tour.                                                                              |
| R2    | Un seul joueur peut détenir le buzz à un instant donné.                                                                                 |
| R3    | L'ordre d'arrivée des buzz est tranché côté serveur de temps réel (pas côté client).                                                    |
| R4    | Un joueur ayant donné une réponse fausse sur un tour ne peut plus buzzer sur **ce tour**.                                               |
| R5    | Un tour se termine sur : Correct, Demi-point, Passer, ou tous les joueurs bloqués.                                                      |
| R6    | Le score est entier ou demi (pas de négatif en v1).                                                                                     |
| R7    | Quitter une salle en cours ne supprime pas le score du joueur ; il peut revenir avec le même pseudo.                                    |
| R8    | L'hôte n'est pas joueur (ne marque pas de points, ne buzze pas).                                                                        |
| R9    | Un buzz reçu par le serveur dans les 500 ms suivant le signal `track:started` est rejeté (délai de grâce post-démarrage du flux audio). |
| R10   | En mode `input`, un joueur ne peut soumettre **qu'une seule** réponse par tour. Une seconde soumission est rejetée.                     |
| R11   | En mode `input`, le scoring auto-calculé est : `correct`=1pt si titre ET artiste matchent ; `half`=0,5pt si un seul matche ; `wrong`=0pt sinon. Le matching utilise la normalisation §4.7ter et Levenshtein ≤ 2. |
| R12   | Le mode de réponse (`buzz` / `input`) ne peut pas changer une fois la salle passée à l'état `playing`.                                   |
| R13   | Un message de tchat est rejeté si vide, > 200 caractères, ou si l'émetteur est en cooldown (< 500 ms depuis son dernier message). Si le tchat est fermé par l'hôte, seuls les messages de l'hôte sont acceptés. |

## 6. Exigences non-fonctionnelles

### 6.1 Performance et temps réel

- Latence buzz → notification "X a buzzé" sur tous les écrans : **< 500 ms** dans des conditions internet normales.
- L'arbitrage du premier buzz est déterministe (pas de "ex æquo" perçu).
- L'audio est diffusé **depuis l'hôte vers chaque joueur en WebRTC peer-to-peer** (voir §6.7) : seul l'hôte charge YouTube ; les joueurs reçoivent uniquement un flux audio anonyme (pas de titre, pas de vidéo, pas de miniature). L'hôte met en pause depuis son lecteur YouTube, ce qui propage la pause à tous les joueurs via le flux WebRTC.

### 6.7 Diffusion audio (WebRTC)

- **Modèle** : hôte = unique broadcaster ; chaque joueur = consommateur. Topologie en étoile : N connexions `RTCPeerConnection` indépendantes (1 par joueur).
- **Source audio côté hôte** : capture du flux audio de l'onglet via `navigator.mediaDevices.getDisplayMedia({ video: false, audio: true })`. L'hôte sélectionne explicitement l'onglet à capturer ; le navigateur affiche un bandeau "Vous partagez l'écran" (limitation des CGU navigateur, non contournable).
- **Anti-fuite** : le joueur ne reçoit qu'un `MediaStream` audio. Aucune métadonnée de la vidéo YouTube n'est envoyée par le canal temps réel. Le DOM côté joueur ne contient ni `videoId`, ni `expectedTitle`, ni `expectedArtist` du tour en cours.
- **Signalisation** : SDP `offer`/`answer` et candidats ICE échangés via le canal temps réel existant (presence channel par salle, événements `client-` directs entre l'hôte et chaque joueur). Pas de message stocké côté serveur ; volume négligeable (~10 messages par paire au setup, 0 ensuite).
- **Serveurs ICE** : STUN publics par défaut (`stun:stun.l.google.com:19302`, `stun:stun.cloudflare.com:3478`). TURN optionnel via variables d'environnement (utile uniquement pour les NAT symétriques rares) ; un fournisseur TURN gratuit suffit.
- **Latence cible** : audio synchronisé à ≤ 200 ms entre joueurs en conditions normales (l'hôte est l'horloge de référence, chaque pair a sa propre dérive sub-perceptible).
- **Délai de grâce post-démarrage** : à chaque début de tour, les buzz envoyés dans les **500 premières millisecondes** après le signal `track:started` sont rejetés côté serveur (R9 ci-dessous), pour neutraliser les disparités de buffering audio entre joueurs.
- **Contraintes navigateur** :
  - Côté hôte : Chrome/Edge/Firefox récents sur desktop. Safari desktop supporte mais avec des limitations connues sur la capture d'audio d'onglet — l'app affiche un avertissement si le navigateur ne supporte pas `getDisplayMedia` audio.
  - Côté joueur : tout navigateur supportant WebRTC (incl. mobile).
- **Repli en cas d'échec WebRTC** : si la connexion P2P entre l'hôte et un joueur ne s'établit pas (timeout 10 s), l'UI joueur affiche un état "Audio indisponible — demande à l'hôte de reconnecter" sans bloquer le buzz (la partie continue, l'hôte peut décider de jouer en local + Discord pour ce joueur). Pas de fallback automatique vers un autre transport en v1.

### 6.8 Saisie texte et tchat

- **Diffusion temps réel** : les soumissions de réponse (mode `input`) et les messages de tchat passent par le même provider pub-sub que le reste de la signalisation (Pusher v1) ; aucune infra additionnelle.
- **Latence** : un message de tchat ou une soumission est visible des autres participants en **< 500 ms** dans des conditions internet normales (même cible que le buzz).
- **Persistance** : tchat et soumissions vivent **uniquement en mémoire serveur**, dans la même structure éphémère que la salle. Détruits avec la salle (fin de partie ou TTL d'inactivité). Aucune écriture disque, aucun export.
- **Anti-fuite (mode input)** : tant qu'un tour est en cours, les soumissions des autres joueurs sont **diffusées masquées** (`•••`). Le contenu en clair n'est envoyé qu'à l'hôte (canal privé) et à tous les participants au moment du `round:resolved`. Une vérification automatisée (test E2E) garantit que `expectedTitle`, `expectedArtist`, `youtubeId` et le contenu masqué des saisies adverses ne fuitent pas dans le DOM joueur pendant la lecture.
- **Limites de taille** :
  - message de tchat : ≤ 200 caractères, après trim.
  - champs de saisie de réponse : ≤ 100 caractères chacun (titre, auteur).
- **Cooldown anti-spam** : 500 ms minimum entre deux messages d'un même joueur (R13). Pas de cooldown pour l'hôte (animation).
- **Modération** : usage privé entre amis assumé, pas de filtre de contenu, pas de bannissement. L'hôte peut fermer le tchat s'il devient gênant (US-85).
- **Accessibilité saisie** : le formulaire de réponse est utilisable au clavier (Tab + Enter pour soumettre) ; sur mobile, l'apparition du clavier virtuel ne doit pas masquer les champs.

### 6.2 Coût

- Hébergement gratuit en v1 : Vercel free tier pour l'app, free tier d'un service de pub-sub temps réel (Pusher Channels / Ably) pour les WebSockets.
- Pas de base de données managée v1 (LocalStorage côté hôte + export/import JSON).
- Aucune dépendance payante.

### 6.3 Qualité de code (contraintes architecturales)

- **Clean Architecture** : séparation claire entre **domaine** (règles du jeu, agrégats Room/Round/Player), **application** (use cases : CreateRoom, JoinRoom, Buzz, ValidateAnswer, …), **infrastructure** (pub-sub, persistance LocalStorage, client YouTube), **présentation** (UI Next.js).
- Le **domaine est pur** : pas de dépendance Next.js, pas d'I/O, pas d'horloge implicite. Les dépendances vers l'extérieur sont injectées via des **ports** (interfaces).
- **Inversion de dépendance** : la couche application définit les ports, l'infrastructure les implémente.
- Code TypeScript en mode strict.

### 6.4 Tests

- **Unit** : couverture des règles métier du domaine ≥ 90 % (Vitest ou équivalent).
- **Intégration** : use cases avec adaptateurs en mémoire (room lifecycle, buzz arbitrage, scoring).
- **E2E** : Playwright sur les parcours critiques :
  - hôte crée une salle, joueur rejoint, partie complète sur une mini-playlist (2–3 morceaux),
  - parcours buzz correct,
  - parcours buzz faux puis re-buzz d'un autre joueur.

### 6.5 Sécurité minimale

- Pas de PII collectée (pseudo libre uniquement).
- Le code de salle n'est pas un secret : la sécurité repose sur l'éphémérité (≤ 8 places, salle détruite à la fin).
- Aucune donnée envoyée à des tiers en dehors de YouTube IFrame API et du provider pub-sub.

### 6.6 Compatibilité

- Desktop Chrome/Firefox/Safari récents.
- Mobile : utilisable (le buzz doit fonctionner au tap), pas d'engagement de pixel-perfect responsive en v1.

## 7. Modèle conceptuel (vue domaine, indicatif)

```
Playlist
  └─ Track { expectedTitle, expectedArtist, youtubeId, startSeconds? }

Room { code, hostId, status: lobby|playing|finished, players[≤8], rounds[] }
  └─ Player { id, nickname, score, connected }
  └─ Round { trackIndex, status: playing|buzzed|resolved, currentBuzzer?, blockedPlayerIds[], outcome? }
```

(Indicatif : la modélisation finale est l'affaire du `/plan`.)

## 8. Questions ouvertes / décisions à confirmer en `/plan`

1. **Diffusion audio** : tranchée — **hôte broadcaster + WebRTC P2P vers chaque joueur** (voir §6.7 et §4.6). La v1 initiale "hôte seul diffuse via Discord" est abandonnée.
2. **Choix Pusher vs Ably** : Pusher conservé (presence + client events suffisent pour la signalisation WebRTC, free tier large).
3. **Persistance** : LocalStorage v1 confirmé ; migration éventuelle vers Turso/Neon hors v1.
4. **Reconnexion** : durée de la fenêtre de "même pseudo = même joueur" (proposition : 5 min après dernier signal).
5. **Anti-abus du buzz** : faut-il une mini-pénalité (cooldown 1 s) sur le bouton buzz côté UI ? Pas de règle métier, choix UX.
6. **TURN** : par défaut, STUN seul ; serveurs TURN configurables via env (`NEXT_PUBLIC_TURN_URL`, `NEXT_PUBLIC_TURN_USERNAME`, `NEXT_PUBLIC_TURN_CREDENTIAL`). Hors-scope v1 : héberger son propre TURN.
7. **Tolérance Levenshtein** (mode `input`) : seuil ≤ 2 retenu pour la v1.1. Si trop laxiste/strict en pratique, paramétrer par l'hôte (slider "tolérance fautes") en v1.2.
8. **Mode mixte buzz + saisie** : explicitement repoussé. La v1.1 limite à un mode unique par partie (R12).
9. **Soumissions tardives** : un joueur qui ne soumet pas avant la fin du tour marque 0 (US-69). Pas de relance "encore 5 secondes". À reconsidérer si frustrant.

## 9. Critères d'acceptation v1 (Definition of Done)

- L'hôte peut créer, lancer et terminer une partie de bout en bout sur une playlist de ≥ 5 morceaux.
- 4 joueurs distincts peuvent jouer une partie complète, buzz inclus, sans erreur d'état.
- Le scoring final reflète exactement la séquence de validations de l'hôte.
- Chaque joueur entend l'audio diffusé par l'hôte via WebRTC, sans qu'aucun titre/artiste/videoId ne fuite dans son DOM (vérification automatisée par un test E2E).
- La pyramide de tests passe en CI (unit + intégration + un E2E "happy path").
- Le code respecte les contraintes Clean Architecture (un test architectural ou une revue documentée le valide).
- Déploiement Vercel fonctionnel sur un domaine vercel.app.
- En mode `input`, une partie complète peut être jouée avec ≥ 3 joueurs : chacun soumet sa réponse, l'auto-validation calcule les points, l'hôte peut overrider, et le scoring final est cohérent avec les règles R10/R11.
- Le tchat fonctionne dans toutes les phases de la salle (lobby/playing/finished), respecte la longueur max et le cooldown (R13), et un joueur arrivant en cours de partie reçoit l'historique (US-82).
- Un test E2E vérifie qu'aucune saisie adverse en clair, ni la réponse attendue, ne fuite dans le DOM joueur tant que le tour n'est pas résolu.

## 10. Hors-scope explicite v1

- Comptes utilisateurs et auth.
- Playlists pré-livrées par l'app.
- Import depuis Spotify/Deezer.
- Import direct via une URL de playlist YouTube ou via l'API YouTube en ligne (l'import v1 se fait à partir d'un **fichier JSON** déjà obtenu, pas d'appel réseau à YouTube). La récupération automatique d'une playlist publique via clé API est hors-scope v1.
- Mode QCM (réponses pré-remplies à choisir parmi N).
- Mode mixte buzz + saisie au sein d'une même partie (R12).
- Bonus de rapidité (en mode `input`, ordre de soumission ignoré pour le scoring v1.1).
- Statistiques inter-parties / historique.
- Internationalisation (FR uniquement).
- Modération de contenu / signalement (tchat brut, usage privé assumé).
- Persistance du tchat ou des soumissions au-delà de la durée de la salle.
- Réactions emoji / mentions / fichiers dans le tchat (texte brut uniquement).
