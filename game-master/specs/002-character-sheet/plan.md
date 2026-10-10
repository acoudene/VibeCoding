# Plan 002 — Fiche de personnage minimale

## Contrôle constitution et ADR
| Principe/ADR | Respecté ? | Justification |
|---|---|---|
| ADR-0002 gratuit/open source | Oui | Aucune nouvelle dépendance |
| ADR-0004 hexagonal/DDD | Oui | Domaine pur ; port `CharacterRepository` ; unicité dans le cas d'usage |
| ADR-0006 LLM derrière un port | Oui | Sortie arbitre étendue (ability) et validée par l'ACL |
| ADR-0008 SRD 5.1 | **Non vérifié (bloquant)** | Tableau standard : existence dans le SRD 5.1 non vérifiée (noté en spec) |
| Constitution « le LLM propose, le domaine décide » | Oui | Le domaine valide l'`Ability` |

## Modèle de domaine
`Ability` + `ABILITIES`, `STANDARD_ARRAY`, `AbilityScores` (VO, fabrique `fromStandardArray`), `Character` (agrégat), port `CharacterRepository`. Voir `docs/domain/README.md`.

## Fichiers par couche
| Couche | Fichiers | Tests |
|---|---|---|
| domain | `domain/rules/ability.ts`, `domain/characters/{ability-scores,character,character-repository}.ts` | `tests/unit/characters.test.ts` |
| application | `application/create-character.ts` ; `agents/rules-arbiter.ts` (+ability) ; `play-turn.ts` (personnage requis) | `rules-arbiter.test.ts`, BDD |
| infrastructure | `persistence/in-memory-character-repository.ts` | via BDD/HTTP |
| presentation | `POST /sessions/:id/characters`, mapping erreurs (400/404/409) | `http-app.test.ts` |

## Contrats
- `POST /sessions/:id/characters` `{playerId, name, abilities:{STR,DEX,CON,INT,WIS,CHA}}` → 201 personnage | 400 `invalid_request` | 404 `session_not_found` | 409 `character_exists`.
- 403 `player_not_in_session` sur les deux routes.
- `POST /sessions/:id/turns` : 409 `character_required` si pas de personnage ; arbitre invalide → 502 `gm_invalid_response`.
- Sortie arbitre : `{"required":true,"difficultyClass":n,"ability":"STR|DEX|CON|INT|WIS|CHA"}`.

## Risques
Rupture du contrat arbitre (spec 001) : mise à jour des prompts et tests. Aucun adaptateur de production touché.
