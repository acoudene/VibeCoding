# Anti-patterns à refuser en revue

| Anti-pattern | Pourquoi | Alternative |
|---|---|---|
| **Domaine anémique** (entités = sacs de champs, logique dans les services applicatifs) | Invariants dispersés | Comportement dans l'agrégat |
| **Domaine dépendant de l'infra** (import D1, fetch, Hono dans `domain/`) | Non testable, viole ADR-0004 | Port + adaptateur |
| **LLM décideur du modèle** (le LLM modifie le modèle DDD ou tranche la grammaire d'un lien) | Non déterministe, tableau n'est plus la source de vérité | Le domaine dérive ; le LLM propose des suggestions, appliquées comme mutations du tableau |
| **Sortie LLM non validée** (`JSON.parse` puis usage direct) | Injection, crash | ACL : parser + valider par schéma Zod (ex. `parseSuggestion`) |
| **Prompt injection ignorée** (texte des post-its concaténé dans un prompt système) | Détournement de l'assistant | Texte utilisateur uniquement en rôle `user`, jamais dans `system` |
| **Appel LLM réel en test** | Flaky, quota | `ScriptedLlm` |
| **`new` d'adaptateur dans un cas d'usage** | Couplage | Injection par constructeur |
| **Aléa/horloge en dur** (`Math.random`, `Date.now` dans le domaine) | Non déterministe | Port `IdGenerator`/`Clock` |
| **Agrégat géant / références objet entre agrégats** | Transactions et verrous énormes | Petits agrégats, références par ID |
| **God use case** (un cas d'usage fait toute la génération et l'export) | Illisible | Un cas d'usage par intention |
| **Primitive obsession** (`number` pour une position, `string` pour `schemaVersion`…) | Valeurs invalides | Objet-valeur validé |
| **DTO = entité** exposé en HTTP | Fuite du modèle | DTO dédié |
| **`any`, cast `as` pour faire taire le compilateur** | Dette de typage | Types précis, garde de type |
| **Mocks de tout** | Tests couplés à l'implémentation | Fakes en mémoire, tests de comportement |
| **Test sans assertion de comportement** / snapshot massif | Faux sentiment de sécurité | Assertions ciblées |
| **Secret dans le code/les logs/les prompts** | Fuite | Variables d'environnement, redaction |
| **Dépendance sans licence vérifiée** | Viole ADR-0002 | Vérifier, indiquer en PR |
| **Édition d'un fichier généré** (`.claude/`, `.codex/`…) | Dérive | Modifier `factory/` puis `factory:sync` |
| **Décision implicite** (choix techno sans ADR) | Perte de traçabilité | ADR `Proposé` |
| **Hypothèse métier silencieuse** | Viole « n'invente rien » | Poser la question |
