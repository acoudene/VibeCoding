# Guidelines de tests (ADR-0010)

1. **Ordre** : spec (`specs/`) → `.feature` (BDD) → tests unitaires rouges → code → vert → refactor.
2. **Unitaires** (`tests/unit/`) : domaine et parsing ACL ; un comportement par test ; noms décrivant le comportement ; pas de mock du domaine.
3. **BDD** (`tests/bdd/`) : Gherkin en français (`# language: fr`), vocabulaire ubiquitaire, un scénario = une règle ; steps via cas d'usage, adaptateurs en mémoire.
4. **Déterminisme** : dés injectés (`{ roll: () => n }`), LLM = `ScriptedLlm` ou fake par rôle.
5. **Architecture** : `npm run test:arch`. Toute nouvelle règle de couche = nouvelle règle dependency-cruiser + test d'échec manuel documenté en PR.
6. **Couverture** : pas de seuil chiffré imposé (❓ à décider) ; en revue, chaque branche métier doit avoir un test.
7. **Bugs** : test de reproduction rouge avant le correctif.
