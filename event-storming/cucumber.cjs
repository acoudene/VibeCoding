const common = {
  paths: ["tests/bdd/features/**/*.feature"],
  import: ["tests/bdd/steps/**/*.ts"],
};

module.exports = {
  // Scénarios @wip : écrits en phase 3 du workflow feature, activés (tag retiré) à leur implémentation.
  default: { ...common, tags: "not @wip" },
  wip: { ...common, tags: "@wip" },
};
