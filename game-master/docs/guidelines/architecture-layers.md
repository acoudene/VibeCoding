# Guidelines par couche (directives)

Chaque règle est **MUST** (bloquant en revue) ou **SHOULD**. Anti-patterns : `antipatterns.md`.

## Sens des dépendances
```
presentation ─▶ application ─▶ domain
infrastructure ─▶ application, domain
main.ts (composition) ─▶ tout
```
Appliqué par `.dependency-cruiser.cjs`.

## Domain (`src/domain/<contexte>/`)
**Rôle** : règles métier pures (agrégats, objets-valeur, services de domaine, ports de persistance/aléatoire).
- MUST : zéro import hors `src/domain` (ni npm, ni `node:`), pas d'I/O, pas de `Date.now()`/`Math.random()` direct (injecter un port).
- MUST : invariants protégés dans l'agrégat ; constructeur ou fabrique qui valide ; état modifiable uniquement via méthodes métier.
- MUST : objets-valeur immuables, égalité par valeur ; références entre agrégats par ID.
- MUST : nommage = langage ubiquitaire (`docs/domain`).
- SHOULD : fonctions pures pour les services de domaine ; erreurs métier typées.
- Bonne pratique : un agrégat par transaction.

## Application (`src/application/`)
**Rôle** : cas d'usage, orchestration, agents IA, ports vers l'extérieur (`LlmPort`).
- MUST : un cas d'usage = une classe/fonction avec `execute(command)` ; dépendances injectées par constructeur (interfaces/ports).
- MUST : aucune règle métier ici (déléguer au domaine) ; aucune connaissance HTTP/SQL/fournisseur LLM.
- MUST : sortie de LLM = donnée non fiable → validée/parsée avant usage (ACL) ; le LLM propose, le domaine décide.
- MUST : un agent = une responsabilité, prompt système en constante nommée, dépend uniquement de `LlmPort`.
- SHOULD : commandes/résultats = DTO simples (pas d'entités exposées).

## Infrastructure (`src/infrastructure/`)
**Rôle** : adaptateurs (LLM, persistance, dés, horloge).
- MUST : implémente un port défini en domaine/application ; ne l'étend pas d'API publique supplémentaire.
- MUST : traduit les erreurs externes en erreurs applicatives ; timeouts sur tout appel réseau.
- MUST : secrets via configuration injectée, jamais en dur ni loggés.
- SHOULD : un test d'adaptateur (contrat) par port.

## Presentation (`src/presentation/`)
**Rôle** : HTTP/WebSocket, validation d'entrée, mapping réponses.
- MUST : valide toute entrée (Zod) ; code HTTP explicite ; pas de logique métier ; n'importe que l'application.
- MUST : n'expose jamais d'objet de domaine brut ni de stack trace.
- SHOULD : handlers fins (< 20 lignes).

## Composition (`src/main.ts`)
Seul endroit où `new` d'infrastructure est autorisé. Aucune logique.

## Qualité transverse (règles pour les agents implémenteurs et relecteurs)
- TypeScript `strict`, pas de `any`, pas de `as` hors frontière externe documentée.
- Fonctions courtes, une raison de changer ; pas de commentaire qui répète le code, commenter le *pourquoi*.
- Pas de code mort, pas de TODO sans référence de spec.
- Nommage : fichiers `kebab-case.ts`, types `PascalCase`, tests `*.test.ts`, features `*.feature`.
- Erreurs : lever des erreurs explicites ; jamais de `catch` vide sans commentaire justifiant.
