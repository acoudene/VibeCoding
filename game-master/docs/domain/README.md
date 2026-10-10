# Modèle DDD — **Proposé, à valider** par l'utilisateur

Dérivé des seules décisions connues : JdR multijoueur, règles SRD 5.1, Game Master IA multi-agents. Tout élément marqué ❓ est une question ouverte, pas un fait.

## Sous-domaines et contextes bornés
| Contexte | Type | Responsabilité | Implémenté |
|---|---|---|---|
| **Play** (Session) | Cœur | Parties, joueurs, tours, historique | Partiel (`GameSession`) |
| **Game Master** | Cœur | Orchestration des agents IA (arbitre, narrateur…) autour d'un tour | Partiel (`PlayTurn`, 2 agents) |
| **Rules** | Support | Règles SRD 5.1 pures et déterministes (jets, tests, plus tard combat) | Partiel (test de caractéristique) |
| **Characters** | Support | Fiches de personnage SRD | Non — ❓ périmètre |
| **Campaign** | Support | Scénario, scènes, faits du monde | Non — ❓ |
| **Identity / Lobby** | Générique | Joueurs, salles | Non — ❓ |

## Context map
```
Identity ──(conformiste)──▶ Play ◀──(client/fournisseur)── Game Master
                              │                                   │
                              ├──(OHS/PL: services purs)──▶ Rules ◀┘
                              └──(référence par ID)──▶ Characters, Campaign
Game Master ──(ACL)──▶ LLM externe (Ollama / tier gratuit) via LlmPort
```
- **Game Master → LLM** : *Anti-Corruption Layer*. La sortie du LLM est non fiable : validée avant tout usage (cf. `parseCheckRequest`).
- **Rules** : le LLM **ne décide jamais** d'un résultat de règle ; il propose (ex. DD), le domaine résout.

## Agrégats (contexte Play, état actuel)
- **GameSession** (racine) — invariants : ≥ 1 joueur ; seul un joueur de la partie agit ; action non vide ; tours numérotés séquentiellement. Contient des `Turn` (VO immuables).
- Références entre agrégats par identifiant uniquement.

## Objets-valeur et services de domaine (Rules)
- `AbilityScore` (1..30, modificateur `floor((v-10)/2)`), `AbilityCheckResult`.
- Service : `resolveAbilityCheck(score, DD, DiceRoller)` — d20 + modificateur ≥ DD.
- Port de domaine : `DiceRoller`, `SessionRepository`.

## Agents du Game Master (couche application)
| Agent runtime | Rôle | Sortie |
|---|---|---|
| `RulesArbiterAgent` | Décide si un test est requis et son DD | JSON validé |
| `NarratorAgent` | Narre à partir du résultat déjà décidé | Texte |
| ❓ NPC / World keeper | Non défini | — |

## Langage ubiquitaire
| Terme (FR) | Identifiant (EN) | Définition |
|---|---|---|
| Partie | `GameSession` | Instance de jeu entre joueurs et Game Master |
| Joueur | `PlayerId` | Participant humain |
| Tour | `Turn` | Une action d'un joueur et sa narration |
| Action | `action` | Intention libre du joueur en texte |
| Test de caractéristique | `AbilityCheck` | d20 + modificateur contre un DD |
| DD (degré de difficulté) | `difficultyClass` | Seuil à atteindre |
| Modificateur | `modifier` | `floor((valeur-10)/2)` |
| Arbitre | `RulesArbiterAgent` | Agent qui traduit une action en exigence de règles |
| Narrateur | `NarratorAgent` | Agent qui raconte le résultat |

Maintenu par l'agent `ddd-modeler`. Tout nouveau terme y entre **avant** le code.
