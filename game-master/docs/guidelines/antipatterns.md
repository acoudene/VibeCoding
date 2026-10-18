# Anti-patterns à refuser en revue

| Anti-pattern | Pourquoi | Alternative |
|---|---|---|
| **Domaine anémique** (entités = sacs de champs, logique dans les services applicatifs) | Invariants dispersés | Comportement dans l'agrégat |
| **Domaine dépendant de l'infra** (import D1, fetch, Hono dans `domain/`) | Non testable, viole ADR-0004 | Port + adaptateur |
| **LLM décideur de règles** (le modèle calcule un jet ou un résultat) | Non déterministe, triche | Le domaine résout ; le LLM narre/propose |
| **Sortie LLM non validée** (`JSON.parse` puis usage direct) | Injection, crash | ACL : parser + valider (cf. `parseCheckRequest`) |
| **Prompt injection ignorée** (action joueur concaténée dans un prompt système) | Détournement du MJ | Entrée joueur uniquement en rôle `user`, jamais dans `system` |
| **Appel LLM réel en test** | Flaky, quota | `ScriptedLlm` |
| **`new` d'adaptateur dans un cas d'usage** | Couplage | Injection par constructeur |
| **Aléa/horloge en dur** (`Math.random`, `Date.now` dans le domaine) | Non déterministe | Port `DiceRoller`/`Clock` |
| **Agrégat géant / références objet entre agrégats** | Transactions et verrous énormes | Petits agrégats, références par ID |
| **God use case** (un cas d'usage fait tout le tour de jeu) | Illisible | Un cas d'usage par intention ; agents séparés |
| **Primitive obsession** (`number` pour DD, score…) | Valeurs invalides | Objet-valeur validé |
| **DTO = entité** exposé en HTTP | Fuite du modèle | DTO dédié |
| **`any`, cast `as` pour faire taire le compilateur** | Dette de typage | Types précis, garde de type |
| **Mocks de tout** | Tests couplés à l'implémentation | Fakes en mémoire, tests de comportement |
| **Test sans assertion de comportement** / snapshot massif | Faux sentiment de sécurité | Assertions ciblées |
| **Secret dans le code/les logs/les prompts** | Fuite | Variables d'environnement, redaction |
| **Dépendance sans licence vérifiée** | Viole ADR-0002 | Vérifier, indiquer en PR |
| **Édition d'un fichier généré** (`.claude/`, `.codex/`…) | Dérive | Modifier `factory/` puis `factory:sync` |
| **Décision implicite** (choix techno sans ADR) | Perte de traçabilité | ADR `Proposé` |
| **Hypothèse métier silencieuse** | Viole « n'invente rien » | Poser la question |
