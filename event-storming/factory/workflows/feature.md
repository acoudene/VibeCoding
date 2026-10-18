---
description: Workflow création de fonctionnalité (Spec Kit) — analyse, DDD, BDD, plan, implémentation par couche, tests, revue. Argument : le besoin.
---
# Workflow `feature`

Entrée : le besoin (`$ARGUMENTS`), éventuellement accompagné d'un `domain-model.json` exporté par l'outil (contrat ADR-0014) : il sert alors de base aux phases 1 et 2 (contextes, agrégats, langage ubiquitaire repris tels quels ; chaque anomalie ou ❓ devient une question à l'utilisateur). Règle transverse : **n'invente rien** — chaque ambiguïté devient une question à l'utilisateur (synthétique, options proposées) ; ne jamais continuer sur une hypothèse. Agents = `factory/agents/<nom>.md` (sous-agents si l'outil le permet, sinon endosse le rôle en lisant le fichier).

| # | Phase | Agent (effort) | Sortie | Porte (gate) |
|---|---|---|---|---|
| 0 | Branche | — | `git switch -c feat/NNN-nom` depuis `main` à jour | — |
| 1 | Spécifier | `business-analyst` (high) | `specs/NNN-*/spec.md` | 🧑 **L'utilisateur répond aux questions et valide la spec** |
| 2 | Modéliser DDD | `ddd-modeler` (xhigh) | `docs/domain/README.md` à jour | 🧑 validation du modèle si concept nouveau |
| 3 | Spécifier BDD | `bdd-specifier` (high) | `tests/bdd/features/*.feature` + steps pending | Chaque FR couvert |
| 4 | Planifier | `solution-architect` (high) | `plan.md`, `tasks.md`, ADR `Proposé` éventuels | 🧑 tout écart ADR/nouvel ADR validé ; contrôle constitution rempli |
| 5 | Implémenter (TDD, dans l'ordre) | `domain-implementer` → `application-implementer` → `infrastructure-implementer` → `presentation-implementer` (medium) | code + tests, tâches cochées | `npm run verify` vert après chaque couche |
| 6 | Tester | `test-engineer` (medium) | trous de couverture comblés | `npm run verify` vert |
| 7 | Documenter | `doc-writer` (low) | docs à jour | `factory:check` vert |
| 8 | Revue | workflow `review` | rapport de synthèse | aucun finding `bloquant` |
| 9 | PR | — | commit(s) Conventional Commits, `git push`, PR via template | 🧑 humain fusionne |

Règles :
- Phases 5.x séquentielles ; tâches `[P]` d'une même couche parallélisables.
- Après un échec de gate : corriger dans la phase concernée, ne pas contourner.
- Ne passe jamais un ADR en `Accepté` ; ne fusionne jamais la PR ; ne pousse pas sur `main`.
- Termine par un résumé : décisions prises par l'utilisateur, questions restantes, état de `verify`.
