/** Règles de dépendance entre couches — voir docs/guidelines/architecture-layers.md et ADR-0004. */
module.exports = {
  forbidden: [
    {
      name: "domain-is-pure",
      comment: "Le domaine ne dépend d'aucune autre couche.",
      severity: "error",
      from: { path: "^src/domain" },
      to: { path: "^src/(application|infrastructure|presentation|main)" },
    },
    {
      name: "domain-no-npm",
      comment: "Le domaine n'importe aucune bibliothèque tierce ni module natif Node (ADR-0003 : exécutable navigateur et Workers).",
      severity: "error",
      from: { path: "^src/domain" },
      to: { dependencyTypes: ["npm", "npm-dev", "npm-peer", "npm-optional", "core"] },
    },
    {
      name: "application-depends-on-domain-only",
      comment: "L'application n'importe ni infrastructure ni présentation.",
      severity: "error",
      from: { path: "^src/application" },
      to: { path: "^src/(infrastructure|presentation|main)" },
    },
    {
      name: "infrastructure-not-presentation",
      severity: "error",
      from: { path: "^src/infrastructure" },
      to: { path: "^src/(presentation|main)" },
    },
    {
      name: "presentation-not-infrastructure",
      comment: "Seules les racines de composition (src/main.worker.ts, src/main.web.tsx) câblent l'infrastructure.",
      severity: "error",
      from: { path: "^src/presentation" },
      to: { path: "^src/(infrastructure|main)" },
    },
    {
      name: "presentation-domain-only-from-web",
      comment:
        "ADR-0018 : seule l'application web (src/presentation/web) lit le domaine ; le reste de la présentation (API HTTP) passe par l'application.",
      severity: "error",
      from: { path: "^src/presentation", pathNot: "^src/presentation/web/" },
      to: { path: "^src/domain" },
    },
    {
      name: "presentation-web-domain-read-only",
      comment:
        "ADR-0018 : l'application web lit le domaine mais n'importe ni ses ports (IdGenerator) ni la modification élémentaire (BoardChange) ; " +
        "toute modification passe par un cas d'usage. Le reste de la lecture seule (pas d'appel aux méthodes de Board qui modifient) relève de la revue.",
      severity: "error",
      from: { path: "^src/presentation/web/" },
      to: { path: "^src/domain.*/(id-generator|board-change)[.]ts$" },
    },
    {
      name: "infrastructure-only-from-composition-roots",
      comment: "Seules les racines de composition (src/main.worker.ts, src/main.web.tsx) et l'infrastructure elle-même importent l'infrastructure.",
      severity: "error",
      from: { path: "^src", pathNot: "^src/(infrastructure/|main\\.(worker\\.ts|web\\.tsx)$)" },
      to: { path: "^src/infrastructure" },
    },
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.json" },
    // Les imports `import type` comptent aussi : un type Yjs/xyflow dans le domaine est une fuite.
    tsPreCompilationDeps: true,
    doNotFollow: { path: "node_modules" },
  },
};
