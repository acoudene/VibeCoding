# Guidelines de tests (ADR-0008)

1. **Ordre** : spec (`specs/`) → `.feature` (BDD) → tests unitaires rouges → code → vert → refactor.
2. **Unitaires** (`tests/unit/`) : domaine et parsing ACL ; un comportement par test ; noms décrivant le comportement ; pas de mock du domaine.
3. **BDD** (`tests/bdd/`) : Gherkin en français (`# language: fr`), vocabulaire ubiquitaire, un scénario = une règle ; steps via cas d'usage, adaptateurs en mémoire.
4. **Déterminisme** : horloge et identifiants injectés, LLM = faux `LlmPort` scripté.
4bis. **Propriétés** (fast-check) : `deriveDomainModel` déterministe, indépendant de l'ordre d'insertion, sortie conforme au JSON Schema.
4ter. **Golden files** : `tests/fixtures/boards/*.json` → `domain-model.json` + `README.md` attendus, versionnés ; toute différence = revue explicite.
4quater. **Infrastructure** : Vitest + Miniflare (mapping `Board ⇄ Y.Doc`, Durable Object) ; **E2E** : Playwright sur les interactions retenues par l'ADR UX.
5. **Architecture** : `npm run test:arch`. Toute nouvelle règle de couche = nouvelle règle dependency-cruiser + test d'échec manuel documenté en PR.
6. **Couverture** : pas de seuil chiffré imposé (❓ à décider) ; en revue, chaque branche métier doit avoir un test.
7. **Bugs** : test de reproduction rouge avant le correctif.
