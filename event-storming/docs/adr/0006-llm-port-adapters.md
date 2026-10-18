# ADR-0006 — LLM derrière un port

- Statut : Accepté · Date : 2026-10-18 · Décideur : utilisateur

## Contexte
L'assistant (sous-projet 004) doit pouvoir utiliser Ollama (local, open source), un tier gratuit, ou Claude en option, de façon interchangeable.
## Décision
Port `LlmPort` (couche application). Adaptateurs en infrastructure : Ollama, tier gratuit (à choisir dans la spec 004 au regard d'ADR-0002), Claude (optionnel), faux scripté (tests). Toute sortie LLM est validée par schéma à la frontière (ACL). Le LLM **propose** des suggestions typées ; une suggestion acceptée devient une mutation du tableau, jamais du modèle. Le texte des post-its n'entre jamais dans un prompt système.
## Alternatives écartées
SDK fournisseur appelé directement depuis les cas d'usage ; génération DDD entièrement par LLM (non déterministe).
## Conséquences
Tests déterministes ; coût d'ajout d'un fournisseur = un adaptateur.
## Vérification
Arch-test (application sans infrastructure) ; revue des prompts et du parsing.
