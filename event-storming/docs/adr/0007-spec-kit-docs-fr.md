# ADR-0007 — Spec Kit, docs en français

- Statut : Accepté · Date : 2026-10-18 · Décideur : utilisateur

## Contexte
Développement piloté par la spécification, comme le reste de l'AI factory.
## Décision
Format `github/spec-kit` : constitution (`.specify/memory/constitution.md`), `specs/NNN-nom/{spec,plan,tasks}.md`. Docs, specs, prompts et features Cucumber en français ; code et identifiants en anglais. Arborescence fournie à la main au format Spec Kit (CLI `specify` non installé).
## Alternatives écartées
Format maison.
## Conséquences
Écart possible avec les templates officiels jusqu'à l'installation du CLI.
## Vérification
Chaque PR de fonctionnalité référence `specs/NNN-*/`.
