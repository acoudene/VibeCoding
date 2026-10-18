# Constitution du projet Event Storming

Version 0.1.0 — 2026-10-18 (à ratifier par l'utilisateur)

## Principes
1. **N'invente rien** : toute ambiguïté → question à l'utilisateur ; pas d'hypothèse silencieuse.
2. **Gratuit ou open source** (ADR-0002).
3. **Spec d'abord** : pas de code sans spec (`specs/NNN-*/spec.md`) validée.
4. **Domaine d'abord** : langage ubiquitaire et DDD avant l'implémentation (`docs/domain`).
5. **Test d'abord** : BDD + TDD ; aucun appel LLM réel dans les tests.
6. **ADR et guidelines contraignants** : `docs/adr`, `docs/guidelines`. Les enfreindre = proposer un ADR.
7. **Le LLM propose, le domaine décide.**
8. **Simplicité** : le plus petit changement qui satisfait la spec ; pas de généralisation spéculative.
9. **PR petites et revues** : workflow `review` avant fusion.
10. **Le tableau est l'unique source de vérité** : le modèle DDD en est dérivé de façon déterministe ; une suggestion acceptée devient une mutation du tableau, jamais du modèle.

## Gouvernance
Amendement par PR modifiant ce fichier, approuvée par l'utilisateur.
