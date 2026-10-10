# ADR-0006 — LLM derrière un port

- Statut : Accepté · Date : 2026-10-10 · Décideur : utilisateur

## Contexte
Ollama (open source, local) et un LLM en tier gratuit (hébergeable) doivent être interchangeables.
## Décision
Port `LlmPort` (couche application). Adaptateurs en infrastructure : `OllamaLlm` (fait), adaptateur tier gratuit (**Proposé : Groq via API compatible OpenAI**, choix utilisateur du 2026-10-10 ; quotas, CGU et absence de carte bancaire à vérifier au regard d'ADR-0002 avant de passer cet amendement à Accepté), `ScriptedLlm` (tests). Toute sortie LLM est validée à la frontière (ACL) ; le LLM ne tranche jamais une règle du domaine. Aucun test n'appelle un vrai LLM.
## Alternatives écartées
SDK fournisseur appelé directement depuis les cas d'usage.
## Conséquences
Tests déterministes ; coût d'ajout d'un fournisseur = un adaptateur.
## Vérification
Arch-test (application sans infrastructure) ; revue des prompts/parsing.
