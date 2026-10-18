# ADR-0009 — Spec Kit officiel, docs en français

- Statut : Accepté · Date : 2026-10-10 · Décideur : utilisateur

## Contexte
Développement piloté par la spécification.
## Décision
`github/spec-kit` : constitution (`.specify/memory/constitution.md`), `specs/NNN-nom/{spec,plan,tasks}.md`. Docs/specs en français, code en anglais. Le CLI `specify` n'est pas installé sur la machine (ni Python/uv) : l'arborescence est fournie à la main au format Spec Kit ; exécuter `specify init --here --ai <agent>` ultérieurement pour superposer les templates officiels.
## Alternatives écartées
Format maison.
## Conséquences
Écart possible avec les templates officiels jusqu'à l'installation du CLI.
## Vérification
Chaque PR de fonctionnalité référence `specs/NNN-*/`.
