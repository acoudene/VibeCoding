# Blind Test — Specification (v1)

> Style: spec-kit `/specify`. Ce document décrit **le quoi**, pas le comment.
> Les choix d'implémentation détaillés sont du ressort de `/plan`.

## 1. Résumé

Application web de blind test musical multi-joueurs en ligne, à destination d'un usage privé entre amis. Un hôte crée une salle, partage un code court ou un lien, jusqu'à 8 joueurs rejoignent et buzzent en temps réel pour reconnaître les morceaux d'une playlist construite par l'hôte. La source audio est YouTube. La validation des réponses est faite vocalement (Discord/IRL) et l'hôte tranche depuis son interface.

## 2. Contexte et objectifs

- **Public visé** : amis du créateur, parties à distance.
- **Objectif primaire** : jouer ensemble, sans friction (pas de compte).
- **Objectif secondaire** : projet d'apprentissage du *vibe coding* avec exigence de qualité Clean Code.
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

## 5. Règles métier (synthèse pour le domaine)

| Règle | Énoncé |
|---|---|
| R1 | Un buzz n'est valide que pendant l'état "lecture" du tour. |
| R2 | Un seul joueur peut détenir le buzz à un instant donné. |
| R3 | L'ordre d'arrivée des buzz est tranché côté serveur de temps réel (pas côté client). |
| R4 | Un joueur ayant donné une réponse fausse sur un tour ne peut plus buzzer sur **ce tour**. |
| R5 | Un tour se termine sur : Correct, Demi-point, Passer, ou tous les joueurs bloqués. |
| R6 | Le score est entier ou demi (pas de négatif en v1). |
| R7 | Quitter une salle en cours ne supprime pas le score du joueur ; il peut revenir avec le même pseudo. |
| R8 | L'hôte n'est pas joueur (ne marque pas de points, ne buzze pas). |

## 6. Exigences non-fonctionnelles

### 6.1 Performance et temps réel
- Latence buzz → notification "X a buzzé" sur tous les écrans : **< 500 ms** dans des conditions internet normales.
- L'arbitrage du premier buzz est déterministe (pas de "ex æquo" perçu).
- L'audio YouTube se met en pause **côté hôte** dès qu'un buzz est validé ; les joueurs n'ont pas besoin d'avoir l'audio chez eux (option par défaut : seul l'hôte diffuse, voir §8 question ouverte).

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

1. **Diffusion audio** : seul l'hôte joue YouTube (les autres écoutent via Discord) **ou** chaque joueur joue YouTube en local synchronisé par signal serveur ? La v1 par défaut : **hôte seul diffuse** (plus simple, plus robuste, latence YouTube non synchronisée).
2. **Choix Pusher vs Ably** : à trancher au `/plan` selon free tier et DX. Le domaine n'en dépend pas (port `RealtimeChannel`).
3. **Persistance** : LocalStorage v1 confirmé ; migration éventuelle vers Turso/Neon hors v1.
4. **Reconnexion** : durée de la fenêtre de "même pseudo = même joueur" (proposition : 5 min après dernier signal).
5. **Anti-abus du buzz** : faut-il une mini-pénalité (cooldown 1 s) sur le bouton buzz côté UI ? Pas de règle métier, choix UX.

## 9. Critères d'acceptation v1 (Definition of Done)

- L'hôte peut créer, lancer et terminer une partie de bout en bout sur une playlist de ≥ 5 morceaux.
- 4 joueurs distincts peuvent jouer une partie complète, buzz inclus, sans erreur d'état.
- Le scoring final reflète exactement la séquence de validations de l'hôte.
- La pyramide de tests passe en CI (unit + intégration + un E2E "happy path").
- Le code respecte les contraintes Clean Architecture (un test architectural ou une revue documentée le valide).
- Déploiement Vercel fonctionnel sur un domaine vercel.app.

## 10. Hors-scope explicite v1

- Comptes utilisateurs et auth.
- Playlists pré-livrées par l'app.
- Import depuis Spotify/Deezer/playlists YouTube publiques.
- Mode QCM, mode saisie texte automatique.
- Bonus de rapidité.
- Statistiques inter-parties / historique.
- Internationalisation (FR uniquement).
- Modération de contenu / signalement.
