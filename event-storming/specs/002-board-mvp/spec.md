# Spec 002 — Tableau MVP mono-utilisateur

- Statut : Validée
- Amendement 2026-10-18 : FR-004 (état d'erreur), confirmé par l'utilisateur le 2026-10-23 (revue de la PR)
- Amendement 2026-10-23 (revue de la PR, décisions utilisateur Q5 à Q7) : FR-003 (taille maximale), US-6 (confirmation avant de quitter), FR-031 (cadres qui se chevauchent), seuil de fluidité
- Contextes bornés : Board
- Référence Event Storming / DDD : `docs/domain/README.md` (agrégat `Board`, grammaire « design level ») ; spec de design § 4.1, § 5 ; ADR-0012 (xyflow), ADR-0013 (Yjs), ADR-0016 (UX inspirée de Miro)

## Problème et valeur
Pour conduire un atelier Event Storming sans Miro, un animateur a besoin d'un tableau infini où poser des post-its **typés**, les relier et les regrouper en contextes bornés, avec des gestes familiers (ADR-0016). Ce tableau est la source de vérité du futur générateur DDD (sous-projet 003) : chaque élément doit donc être typé et structuré, pas seulement coloré.

## Récits utilisateur
- **US-1** En tant qu'animateur, je crée un tableau et je l'ouvre par une URL que je peux retrouver.
- **US-2** Je pose des post-its d'un type donné (événement, commande…) et j'écris leur texte directement dessus.
- **US-3** Je relie des post-its par des flèches ; l'outil me signale les liens qui ne respectent pas la grammaire, sans les interdire.
- **US-4** Je dessine des cadres qui représentent des contextes bornés et j'y range des post-its.
- **US-5** Je navigue (zoom, déplacement), je sélectionne, duplique, copie-colle, supprime, annule et rétablis.
- **US-6** Je ferme le navigateur et je retrouve mon tableau intact. Si des modifications ne sont pas encore enregistrées, le navigateur me demande confirmation avant de quitter (ADR-0017, amendement 2026-10-23).

## Exigences fonctionnelles

### Tableau
- **FR-001** Créer un tableau ; il reçoit un identifiant non devinable et s'ouvre à l'URL `/b/<id>` (spec de design § 5 « Accès MVP »).
- **FR-002** Ouvrir un tableau existant par son URL ; une URL inconnue affiche « Tableau introuvable ».
- **FR-003** L'état du tableau est conservé côté serveur et restauré à l'ouverture (ADR-0013 : un `Y.Doc` par tableau, Durable Object). L'état enregistré d'un tableau est limité à 1,5 Mio : une modification qui le dépasserait est refusée par le serveur et l'indicateur affiche « Erreur d'enregistrement » *(Q6)*.
- **FR-004** Les modifications sont envoyées au serveur sans action de l'utilisateur ; un indicateur affiche « Enregistré » / « Enregistrement… » / « Hors ligne » / « Erreur d'enregistrement ». *Amendement 2026-10-18 (confirmé par l'utilisateur le 2026-10-23) : « Erreur d'enregistrement » signale un refus définitif du serveur (tableau introuvable, mise à jour refusée) ; aucun nouvel essai automatique, les modifications restent dans la page.*
- **FR-005** La page d'accueil propose « Nouveau tableau » et liste les tableaux déjà ouverts **dans ce navigateur** (stockage local : nom, date de dernière ouverture), du plus récent au plus ancien ; on peut retirer un tableau de cette liste sans le supprimer côté serveur. *(Q2)*
- **FR-006** Un tableau a un nom, modifiable depuis le tableau ; par défaut « Tableau sans titre ».

### Post-its
- **FR-010** Une palette propose les 9 types (`DomainEvent`, `Command`, `Actor`, `Aggregate`, `Policy`, `ReadModel`, `ExternalSystem`, `Hotspot`, `Rule`) ; on choisit un **type**, jamais une couleur (ADR-0016).
- **FR-011** La couleur d'un post-it est dérivée de son type (`stickyColor`, `docs/domain/README.md`) et n'est jamais saisie.
- **FR-012** Avec un type actif, un clic sur le canvas pose un post-it de ce type à cet endroit, sélectionné et en mode édition de texte (ADR-0016).
- **FR-013** Le texte (`label`, FR) s'édite en place ; la taille de police s'adapte au contenu ; `Échap` ou un clic ailleurs termine l'édition.
- **FR-014** Un panneau contextuel du post-it sélectionné permet : changer le type, saisir l'`identifier` (EN, facultatif), saisir des notes, supprimer.
- **FR-015** Glisser un post-it le déplace (sélectionné ou non).
- **FR-016** Une légende fixe, toujours visible, associe chaque type à sa couleur et à son nom FR ; le violet y est nommé *Policy* (ADR-0016).
- **FR-017** Tous les post-its ont la même taille fixe ; ils ne sont pas redimensionnables. *(Q3)*

### Liens
- **FR-020** Un post-it sélectionné ou survolé expose 4 points de connexion ; glisser depuis l'un d'eux vers un autre post-it crée un lien orienté avec une flèche à l'arrivée.
- **FR-021** Un lien suit les post-its déplacés et s'accroche automatiquement au côté le plus proche.
- **FR-022** Un lien hors grammaire (`docs/domain/README.md`, « Grammaire design level ») est créé mais affiché comme anomalie (style distinct + info-bulle citant la règle attendue).
- **FR-023** Un lien d'un post-it vers lui-même est refusé (invariant `Board`).
- **FR-024** Un lien sélectionné peut être inversé ou supprimé ; supprimer un post-it supprime ses liens.

### Cadres (contextes bornés)
- **FR-030** `F` puis glisser crée un cadre ; son nom est édité immédiatement (par défaut « Contexte 1 », « Contexte 2 »…).
- **FR-031** Un post-it appartient au cadre qui contient son centre (invariant `Board`) ; déplacer un cadre déplace les post-its qui lui appartiennent. Si le centre d'un post-it est dans plusieurs cadres, il appartient au **plus petit** *(Q5)*.
- **FR-032** Un cadre peut être renommé, redimensionné et supprimé ; le supprimer ne supprime pas les post-its qu'il contient.

### Sélection, presse-papiers, historique
- **FR-040** Glisser sur une zone vide trace un lasso ; `Maj` + clic ajoute à la sélection.
- **FR-041** `Suppr` / `Retour arrière` supprime la sélection.
- **FR-042** `Ctrl+D` duplique la sélection juste en dessous et sélectionne la copie.
- **FR-043** `Ctrl+C` / `Ctrl+V` copie et colle la sélection à la position du pointeur ; les liens internes à la sélection sont copiés.
- **FR-044** `Ctrl+Z` / `Ctrl+Y` (et `Ctrl+Maj+Z`) annulent et rétablissent opération par opération ; boutons équivalents dans l'interface.

### Navigation
- **FR-050** Molette : zoom centré sur le pointeur ; `Espace` + glisser : déplacement de la vue.
- **FR-051** Boutons zoom + / − par paliers, affichage du pourcentage, bouton « Ajuster à l'écran ».
- **FR-052** La position et le zoom de la vue sont conservés au rechargement, pour ce navigateur.

## Hors périmètre
Redimensionnement des post-its (Q3) ; déploiement Cloudflare : tout s'exécute en local (`wrangler dev`, Miniflare), le déploiement fera l'objet d'une étape dédiée (Q4) ; liste serveur des tableaux (Q2) ; temps réel multi-utilisateur, curseurs partagés, identité, authentification (→ 005) ; génération et export DDD (→ 003) ; assistant IA (→ 004) ; couleurs libres, formes, dessin, images, commentaires, réactions, votes, minuteur, modèles, import Miro (ADR-0016) ; étapes d'atelier guidées.

## Termes du langage ubiquitaire (nouveaux/modifiés)
| Terme (FR) | Identifiant (EN) | Définition |
|---|---|---|
| Type actif | `activeKind` | Type de post-it sélectionné dans la palette, appliqué au prochain clic sur le canvas |
| Lien hors grammaire | `Link.outOfGrammar` | Lien accepté mais non conforme à la grammaire « design level » |
| Point de connexion | `ConnectionHandle` (UI) | Point d'un bord de post-it depuis lequel on tire un lien |

## Scénarios BDD (liens vers `tests/bdd/features/`)
À produire en phase 3 (`bdd-specifier`) : `board/creation-tableau.feature`, `board/post-its.feature`, `board/liens.feature`, `board/cadres.feature`, `board/selection-historique.feature`, `board/types-de-post-it.feature`.

## Critères d'acceptation mesurables
- Chaque FR est couvert par au moins un scénario BDD ou un test E2E Playwright.
- Les gestes de la liste « Reproduire » d'ADR-0016 sont couverts par des tests E2E.
- Un tableau de 300 post-its et 300 liens reste fluide : déplacement d'un post-it et zoom à ≥ 30 images/s sur la machine de développement *(Q7)*.
- Fermer puis rouvrir le navigateur restitue exactement le même tableau (mêmes éléments, positions, textes, types, liens, cadres).
- `npm run verify` vert ; le domaine n'importe ni Yjs, ni xyflow, ni Hono (`test:arch`).

## Décisions de clarification (utilisateur, 2026-10-18)
| # | Question | Décision |
|---|---|---|
| Q1 | Couleur du post-it `Rule` | **Gris** (le ❓ de `docs/domain/README.md` est levé) |
| Q2 | Retrouver ses tableaux | **Liste locale** au navigateur (FR-005) |
| Q3 | Taille des post-its | **Fixe** (FR-017) |
| Q4 | Déploiement | **Local d'abord** ; déploiement Cloudflare dans une étape dédiée |
| Q5 | Cadres qui se chevauchent (2026-10-23) | Le post-it appartient au **plus petit** cadre qui contient son centre (FR-031) |
| Q6 | Taille maximale d'un tableau (2026-10-23) | **1,5 Mio** d'état enregistré ; au-delà, refus (`413`) et « Erreur d'enregistrement » (FR-003, FR-004) |
| Q7 | Seuil de fluidité (2026-10-23) | **30 images/s** validé |

## [À CLARIFIER]
Aucune question bloquante restante.
