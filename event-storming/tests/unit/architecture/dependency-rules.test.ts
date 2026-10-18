import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../../..");
const fixtureRoot = join(projectRoot, "tests/fixtures/architecture");
const depcruise = join(projectRoot, "node_modules/dependency-cruiser/bin/dependency-cruiser.mjs");

/** Lance les vraies règles du projet sur un fichier fixture qui viole volontairement la pureté du domaine. */
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
