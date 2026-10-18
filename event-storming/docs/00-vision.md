# Vision

**But** : un tableau blanc spécialisé **Event Storming**, à l'UX inspirée de Miro, qui **génère un modèle DDD** à la fin d'un atelier. Le modèle DDD exporté est le pivot du produit.

Trois usages simultanés :
1. **Outil d'atelier** réel (perso / équipe).
2. **Brique de l'AI factory** : `domain-model.json` est un contrat lisible par machine, consommé par le workflow `feature`.
3. **Démo vibe coding** : un « mini-Miro » spécialisé, soigné.

## Critères de succès
- Un atelier « design level » peut être conduit de bout en bout (post-its typés, liens, cadres de contexte) sans quitter l'outil.
- `deriveDomainModel` est **déterministe** : même instantané ⇒ même modèle, octet pour octet.
- Un tableau de référence reproduisant le domaine de `game-master` régénère un équivalent de `game-master/docs/domain/README.md`.
- `domain-model.json` est validé par un JSON Schema versionné et accepté en entrée par le workflow `feature`.

## Décisions utilisateur (2026-10-18)
Mono-utilisateur d'abord, architecture CRDT (Yjs) dès le départ · génération DDD hybride (règles déterministes + assistant LLM optionnel) · 2ᵉ projet de l'AI factory, autonome · observation de Miro par REA (runtime, navigateur piloté par Claude) · canvas xyflow. Détail : `docs/superpowers/specs/2026-10-18-event-storming-design.md`.

## Sous-projets
| # | Sous-projet | Livrable |
|---|---|---|
| 000 | Bootstrap | Projet, AI factory, docs, ADR, CI |
| 001 | Observation Miro (REA) | Rapport observé/déduit/inconnu + ADR « UX inspirée de Miro » |
| 002 | Board MVP mono-utilisateur | Canvas xyflow, post-its typés, liens, cadres, état Yjs, persistance Durable Object |
| 003 | Générateur DDD déterministe | `deriveDomainModel` + exports JSON / Markdown |
| 004 | Assistant IA | Suggestions via `LlmPort` |
| 005 | Temps réel | Synchro Yjs WebSocket, présence, identité |

## Questions ouvertes (à trancher, ne pas deviner)
- Nom définitif du produit (provisoire : `event-storming`).
- Niveaux « big picture » et « process level » : seul le « design level » alimente la génération DDD — à confirmer après 001.
- Couleur du post-it `Rule` (provisoire : gris) — à confirmer en 002.
- Modèles par outil (Copilot, Codex, Gemini) : `factory/models.json` à renseigner.
