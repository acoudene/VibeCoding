# Vision

**But** : un JdR multijoueur en tour par tour où un Game Master IA (plusieurs agents) arbitre selon les règles D&D 5e SRD 5.1 et narre l'histoire.

**But secondaire** : servir de pilote à une AI factory réutilisable (agents d'analyse, DDD, BDD, implémentation, revue).

## Décisions utilisateur (2026-10-10)
Stack TypeScript full-stack · Cloudflare gratuit · LLM derrière un port (Ollama + tier gratuit) · orchestration maison · SRD 5.1 · Spec Kit officiel · docs en français · IaC GitHub OpenTofu (état R2) · pas de LLM en CI.

## Décisions utilisateur (2026-10-10, validées sur proposition)
1. LLM tier gratuit : Groq via API compatible OpenAI (quotas à vérifier avant l'adaptateur).
2. SRD v1 : fiche de personnage (6 caractéristiques), test de caractéristique, PV. Combat, sorts, classes en v2.
3. Joueurs : pseudo sans compte, rejoindre par code de partie.
4. Front : React + Vite sur Cloudflare Pages, interface de chat.

## Questions ouvertes (à trancher, ne pas deviner)
- Modèles par outil (Copilot, Codex, Gemini) : `factory/models.json` à renseigner.
- Attribution CC-BY-4.0 du SRD : texte exact à valider (ADR-0008).
- Voir « À clarifier » de chaque spec.
