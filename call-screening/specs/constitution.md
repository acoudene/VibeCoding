# Constitution — Call Screening

Principes non négociables qui régissent ce projet. Toute spec, plan ou tâche doit s'y conformer.

## Principes

1. **Specification First.** Aucun code de production n'est écrit avant que le comportement
   correspondant soit décrit dans une spec (`specs/`). La spec est la source de vérité.

2. **TDD strict.** Tout comportement est d'abord couvert par un test qui échoue (RED),
   puis par le code minimal qui le fait passer (GREEN), puis refactorisé (REFACTOR).
   Aucun code de production n'est commité sans test l'exerçant.

3. **End-to-End comme filet de sécurité principal.** La valeur métier (un appel d'un
   préfixe interdit est renvoyé en messagerie et marqué spam) est vérifiée par des
   tests E2E qui traversent toute la stack (HTTP → décision → base → réponse).
   Les tests unitaires couvrent le moteur de décision et les cas limites.

4. **Cœur indépendant de la téléphonie.** La logique de filtrage (le « moteur de
   décision ») ne dépend d'aucun fournisseur. Twilio n'est qu'un *adaptateur* qui
   traduit la décision en TwiML. On peut tester le cœur sans compte Twilio.

5. **Déterminisme et observabilité.** À entrée identique (numéro + ensemble de
   préfixes), la décision est toujours identique. Chaque appel évalué est journalisé.

6. **Simplicité d'abord.** Pas d'abstraction spéculative. On ajoute une couche
   seulement quand une spec l'exige.

## Stack imposée

- Runtime : Node.js 24, TypeScript strict.
- Framework : Next.js 16 (App Router) — API routes + UI admin.
- Base de données : PostgreSQL (Neon via Vercel Marketplace), ORM Drizzle.
- Tests unitaires : Vitest. Tests E2E : Playwright.
- Déploiement cible : Vercel.

## Définition de « terminé » (Definition of Done)

- [ ] Comportement décrit dans une spec.
- [ ] Test(s) écrit(s) en premier et passant(s).
- [ ] `npm run typecheck`, `npm run test`, `npm run test:e2e` au vert.
- [ ] Pas de préfixe interdit qui « passe » sans être journalisé.
