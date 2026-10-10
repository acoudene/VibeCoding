# Vision

**But** : un JdR multijoueur en tour par tour où un Game Master IA (plusieurs agents) arbitre selon les règles D&D 5e SRD 5.1 et narre l'histoire.

**But secondaire** : servir de pilote à une AI factory réutilisable (agents d'analyse, DDD, BDD, implémentation, revue).

## Décisions utilisateur (2026-10-10)
Stack TypeScript full-stack · Cloudflare gratuit · LLM derrière un port (Ollama + tier gratuit) · orchestration maison · SRD 5.1 · Spec Kit officiel · docs en français · IaC GitHub OpenTofu (état R2) · pas de LLM en CI.

## Questions ouvertes (à trancher, ne pas deviner)
1. Quel fournisseur « tier gratuit » pour l'adaptateur LLM (Gemini, Groq, OpenRouter…) ?
2. Périmètre SRD de la v1 (création de personnage ? combat ? sorts ?) — seul le test de caractéristique est implémenté.
3. Identité des joueurs/lobby : anonyme, pseudo, ou compte ?
4. Front web : React/Vite confirmé ? Interface de chat seule ou plateau ?
5. Modèles par outil (Copilot, Codex, Gemini) : `factory/models.json` à renseigner.
6. Attribution CC-BY-4.0 du SRD : texte exact à valider (ADR-0008).
