# Observation de Miro avec REA (sous-projet 001)

- **Date** : 2026-10-18
- **Cadre** : ADR-0015. Un seul tableau de test appartenant à l'utilisateur, initialisé avec le template Event Storming de Miro. Connexion à Miro faite par l'utilisateur ; aucun identifiant saisi par l'agent ; aucune analyse du code de Miro.
- **Environnement** : Microsoft Edge 155 (Chromium), profil dédié et temporaire, CDP sur `127.0.0.1:9222`, interface Miro en français, plan Free.
- **Statut** : complet pour le périmètre prévu (voir § 5 pour ce qui reste inconnu).

## 1. Méthode et provenance

| Source | Contenu | Preuve |
|---|---|---|
| REA `list_browser_targets` | Identification de l'onglet du tableau | `ev_c78c4b1eaa26ada168d19593dd2c815ea4adcff16692a78517c9543e03561c22` |
| REA `inspect_web_page` (passif) | Arbre d'accessibilité : libellés des outils | `ev_2959b2cf419049defb77c09f1f6a4cb0f1de002d7b7715a12bcf22e292c49957` |
| REA `capture_web_screenshot` | État initial (template) | `ev_da0609fef3c53d87e918448951ead1cd5f9d150031c04a2c8349aa78da99f071` |
| REA `capture_browser_scenario` — scénario A | Post-it : pose, texte, annuler, rétablir, zoom ; réseau et WebSocket | `ev_4098742791b057893fb6cf3ae952409e4a8c879c7952b9a508a813af688fbf65` |
| REA `capture_browser_scenario` — scénario B | Sélection, dupliquer, copier-coller, panneaux Cadres / Formats / Modèles | `ev_19dde122ef60beae8bdda76012c4d60669c540a46dd6c0ec5b165f60bcc05e73` |
| Script Playwright local (hors REA) | Gestes de glisser : déplacer, lier, lasso, molette, Espace+glisser, cadre | captures non versionnées (données de session) |
| REA `capture_web_screenshot` | État final (lien, cadre « Cadre 1 ») | `ev_e87668d26ac6dbf30ab1a2ac5b04ada52a057d5dd10228c8cc9f8350834f740f` |

Les actions déclaratives de REA ne proposent pas de glisser-déposer : les gestes de glisser ont été pilotés par un script Playwright local connecté au même navigateur. Ces observations sont **observées** (captures avant/après), mais n'ont pas d'identifiant de preuve REA.

Deux essais de scénario ont échoué avant le scénario A et sont conservés comme preuves de méthode : `ev_eabe91a8…` (sélecteur `canvas` ambigu : 9 éléments) et `ev_39657407…` (clic sur `#active_users_layer` intercepté par `#main-canvas`).

**Limite outillage relevée** : avec la valeur par défaut `service_workers: "block"`, `capture_browser_scenario` échoue sur Miro avant toute action (`InvalidStateError: Failed to get ServiceWorkerRegistration objects` dans une iframe). Contournement : `environment.service_workers: "allow"`.

Légende : **O** = observé · **D** = déduit · **?** = inconnu.

## 2. Observations

### 2.1 Grammaire visuelle du template Event Storming de Miro
| # | Fait | Type | Preuve |
|---|---|---|---|
| G1 | Légende du template : Domain Event = orange ; User/Actor = jaune pâle ; Business Process = violet ; Command = bleu ; Aggregate = jaune ; External System = rose ; View / Read Model = vert ; Question Marks / Risks = rouge | O | `ev_da0609fe…` |
| G2 | Le template est organisé en 4 étapes encadrées : Collect Domain Events (Big Picture) → Refine Domain Events → Track causes (Process Modelling) → Find aggregates & re-sort them (Software Modelling) | O | `ev_da0609fe…` |
| G3 | À l'étape 4, les agrégats sont regroupés par des **ellipses** nommées (Order captured, Shopping cart, Checkout process, Payment processing, Order fulfillment, Offers), pas par des cadres | O | `ev_da0609fe…` |
| G4 | La couleur porte le sens : rien dans Miro n'empêche un post-it « bleu » d'être un événement | D | — |

### 2.2 Post-its
| # | Fait | Type | Preuve |
|---|---|---|---|
| P1 | L'outil Pense-bête ouvre une palette de 16 couleurs et un mode « Bloc » ; un clic sur le canvas pose un post-it (jaune pâle par défaut) | O | `ev_4098…` étapes 03-05 |
| P2 | Le post-it posé est immédiatement sélectionné : 4 poignées d'angle (redimensionnement), 4 points de connexion au milieu des côtés, barre d'outils contextuelle flottante (type, police « Auto », gras, alignement, lien, taille « L », couleur, tag, réaction, commentaire, verrou, traduction, menu) | O | `ev_4098…` étape 05 |
| P3 | La saisie du texte se fait en place ; le texte est centré et sa taille s'adapte (« Auto ») | O | `ev_4098…` étape 08 |
| P4 | `Ctrl+D` duplique le post-it juste en dessous, accolé, et sélectionne la copie | O | `ev_19dd…` étape 06 |
| P5 | `Ctrl+C` / `Ctrl+V` colle à la position du pointeur (ici par-dessus l'original) | O / D (position) | `ev_19dd…` étape 09 |
| P6 | Glisser un post-it non sélectionné le déplace directement | O | script local |

### 2.3 Liens (connecteurs)
| # | Fait | Type | Preuve |
|---|---|---|---|
| L1 | Glisser depuis un point de connexion crée un lien ; relâché sur un post-it, il s'accroche à son bord avec une flèche à l'arrivée | O | script local, `ev_e876…` |
| L2 | Barre d'outils du lien : extrémité de départ (« Aucun »), inverser le sens, extrémité d'arrivée (flèche), type de tracé, couleur, texte sur le lien, verrou | O | script local |
| L3 | Le lien suit les post-its déplacés ; il devient courbe et **change de côté d'accroche** automatiquement selon la position relative | O | script local |
| L4 | Un lien est un objet sélectionnable à part entière | O | script local (lasso : « 2 objets ») |

### 2.4 Sélection
| # | Fait | Type | Preuve |
|---|---|---|---|
| S1 | Glisser sur une zone vide trace un rectangle de sélection (lasso) | O | script local |
| S2 | Le lasso sélectionne aussi un lien seulement partiellement couvert (sélection par intersection) | O / D (règle exacte) | script local |
| S3 | Barre multi-sélection : filtre par type (« 2 objets »), « Convertir en », regrouper / cadrer, verrou | O | script local |

### 2.5 Cadres
| # | Fait | Type | Preuve |
|---|---|---|---|
| C1 | `F` puis glisser crée un cadre nommé automatiquement (« Cadre 1 »), titre au-dessus à gauche, fond blanc | O | script local, `ev_e876…` |
| C2 | Un post-it situé dans la zone tracée devient enfant du cadre : déplacer le cadre par son titre déplace le post-it | O | script local |
| C3 | L'icône cadre de la barre latérale ouvre d'abord des formats (Personnalisé, A4, Lettre, 16:9, 4:3, 1:1, Mobile, Tablette, Bureau) | O | script local |
| C4 | Le panneau « Cadres » liste les cadres en vignettes, pour naviguer et créer des diapositives | O | `ev_19dd…` étape 12 |

### 2.6 Navigation, historique
| # | Fait | Type | Preuve |
|---|---|---|---|
| N1 | Molette seule = zoom centré sur le pointeur (33 % → 29 %) | O | script local |
| N2 | `Ctrl` + molette = zoom ; Espace + glisser = déplacement de la vue | O | script local |
| N3 | Boutons « Zoomer » / « Dézoomer » par paliers (31 % → 33 %), indicateur de zoom, bouton d'ajustement à l'écran | O | `ev_4098…` étape 14 |
| N4 | La position et le zoom de la vue sont conservés au rechargement | O | script local |
| H1 | « Annuler » annule la dernière opération seule (le texte, pas la création du post-it) ; « Rétablir » la rejoue | O | `ev_4098…` étapes 10-12 |

### 2.7 Synchronisation (réseau)
| # | Fait | Type | Preuve |
|---|---|---|---|
| R1 | Les modifications du tableau transitent par un WebSocket multiplexé `wss://miro.com/rtc-gateway/mux` ; aucune requête REST d'édition | O | `ev_4098…` |
| R2 | Messages **binaires** courts par opération (26 à 570 octets) : pose = 5 messages, fin d'édition du texte = 2, annuler = 4, rétablir = 4 | O | `ev_4098…` |
| R3 | Synchronisation par opérations (deltas), pas par envoi du document complet | D | R2 |
| R4 | « Annuler » est rejoué comme une nouvelle opération envoyée au serveur | D | R2 |
| R5 | Le format binaire des messages (protobuf ou autre) | ? | contenu non retenu |

### 2.8 Hors périmètre observé
Formats (Prototype, Diagramme, Table, Planning, Kanban, Document, Diapositives, Flux), bibliothèque de modèles (recherche, catégories, modèles IA), assistant IA intégré, réactions, commentaires, présentation, partage.

## 3. Inventaire priorisé pour l'outil Event Storming

| Interaction | Miro | Décision proposée | Sous-projet |
|---|---|---|---|
| Palette de types (pas de couleurs libres) | 16 couleurs libres (P1, G4) | **Simplifier** : on choisit un *type* ; la couleur en découle (invariant du domaine) | 002 |
| Poser un post-it au clic, texte en place, taille auto | P1-P3 | **Reproduire** | 002 |
| Points de connexion + glisser pour lier, flèche, ancrage auto | L1, L3 | **Reproduire** ; xyflow gère poignées et arêtes. La grammaire marque les liens hors règles (ADR-0004) | 002 |
| Barre d'outils contextuelle | P2, L2 | **Simplifier** : type, identifiant EN, notes, supprimer ; sens du lien | 002 |
| Dupliquer `Ctrl+D`, copier-coller au pointeur | P4, P5 | **Reproduire** | 002 |
| Lasso, sélection multiple | S1, S2 | **Reproduire** (xyflow : `selectionOnDrag`) | 002 |
| Cadre = contexte borné, `F` + glisser, enfants qui suivent | C1, C2 | **Reproduire** : un `Frame` = un contexte borné nommé ; appartenance = centre du post-it dans le cadre (spec § 4.1) | 002 |
| Zoom molette sur pointeur, Espace + glisser, paliers, ajuster | N1-N3 | **Reproduire** | 002 |
| Vue conservée au rechargement | N4 | **Reproduire** (préférence locale par tableau) | 002 |
| Annuler / rétablir par opération | H1 | **Reproduire** : `Y.UndoManager` (ADR-0013) | 002 |
| Légende du template | G1 | **Reproduire** : légende fixe des types, toujours visible | 002 |
| Étapes du template (Big Picture → Software Modelling) | G2 | **Plus tard** : modes d'atelier guidés | après 003 |
| Regroupement d'agrégats par ellipses | G3 | **Remplacer** par des cadres typés (contexte borné), exploitables par le générateur | 002 / 003 |
| Synchro par deltas sur WebSocket | R1-R3 | **Conforter** ADR-0013 : mises à jour Yjs incrémentales ; WebSocket en 005 | 005 |
| Formats, modèles, IA, réactions, commentaires, présentation | § 2.8 | **Hors périmètre** | — |

## 4. Écarts avec la spec révélés par l'observation

1. **Violet** : le template Miro l'attribue à *Business Process*, la spec à *Policy*. Dans le vocabulaire de Brandolini, le violet / lilas désigne la *policy* : la spec est conservée, la légende de l'outil le dira explicitement.
2. **`Rule`** : absent du template Miro. Aucune convention observée ne fixe sa couleur → la question ❓ (gris provisoire) reste ouverte.
3. **Agrégats regroupés par ellipses** chez Miro : non exploitables par une dérivation déterministe. Confirme le choix des cadres (`Frame`) comme contextes bornés.

## 5. Inconnus restants

- Format binaire des messages WebSocket (R5) : non nécessaire au produit.
- Règle exacte de sélection du lasso (intersection ou inclusion d'une extrémité) (S2).
- Comportement d'un post-it à cheval sur deux cadres : non testé.
- Raccourcis clavier autres que `Ctrl+D`, `Ctrl+C`, `Ctrl+V`, `F`, Espace, `Échap` : non testés.

## 6. Données personnelles

Ni identifiant de compte, ni nom d'organisation, ni jeton n'est reproduit ici. Les captures d'écran et les journaux de protocole sont restés dans le répertoire temporaire de la session ; ils ne sont pas versionnés.
