import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../../..");
const fixtureRoot = join(projectRoot, "tests/fixtures/architecture");
const depcruise = join(projectRoot, "node_modules/dependency-cruiser/bin/dependency-cruiser.mjs");

/** Lance les vraies règles du projet sur un fichier fixture (violation volontaire ou racine de composition). */
function cruise(file: string) {
  const run = spawnSync("node", [depcruise, file, "--config", join(projectRoot, ".dependency-cruiser.cjs")], {
    cwd: fixtureRoot,
    encoding: "utf8",
  });
  return { status: run.status, output: run.stdout + run.stderr };
}

describe("règles d'architecture : le domaine reste pur", () => {
  it.each([
    ["une bibliothèque npm importée à l'exécution", "src/domain/runtime-npm.ts"],
    ["une bibliothèque npm importée en type seulement", "src/domain/type-only-npm.ts"],
    ["un module natif Node (node:crypto)", "src/domain/node-builtin.ts"],
  ])("refuse %s", (_label, file) => {
    const { status, output } = cruise(file);
    expect(output).toContain("domain-no-npm");
    expect(status).not.toBe(0);
  });
});

describe("règles d'architecture : sens des dépendances entre couches", () => {
  it.each([
    ["la présentation importe l'infrastructure", "src/presentation/imports-infrastructure.ts", "infrastructure-only-from-composition-roots"],
    ["l'application importe une racine de composition", "src/application/imports-main.ts", "application-depends-on-domain-only"],
    ["l'infrastructure importe une racine de composition", "src/infrastructure/imports-main.ts", "infrastructure-not-presentation"],
  ])("refuse que %s", (_label, file, rule) => {
    const { status, output } = cruise(file);
    expect(output).toContain(rule);
    expect(status).not.toBe(0);
  });

  it.each([
    ["l'API HTTP importe le domaine", "src/presentation/api/imports-domain.ts", "presentation-domain-only-from-web"],
    ["l'application web importe un port du domaine", "src/presentation/web/imports-domain-port.ts", "presentation-web-domain-read-only"],
    ["l'application web importe la modification élémentaire du tableau", "src/presentation/web/imports-board-change.ts", "presentation-web-domain-read-only"],
  ])("refuse que %s (exception ADR-0018 limitée)", (_label, file, rule) => {
    const { status, output } = cruise(file);
    expect(output).toContain(rule);
    expect(status).not.toBe(0);
  });

  it("autorise l'application web à lire le domaine : objets-valeur, constantes, fonctions pures (ADR-0018)", () => {
    const { status, output } = cruise("src/presentation/web/reads-domain.ts");
    expect(output).not.toMatch(/error/i);
    expect(status).toBe(0);
  });

  it.each([
    ["src/main.worker.ts"],
    ["src/main.web.tsx"],
  ])("autorise la racine de composition %s à importer l'infrastructure et la présentation", (file) => {
    const { status, output } = cruise(file);
    expect(output).not.toMatch(/error/i);
    expect(status).toBe(0);
  });
});
