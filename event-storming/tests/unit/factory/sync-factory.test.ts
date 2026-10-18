import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../../..");

describe("sync-factory", () => {
  let repo: string;
  const at = (...p: string[]) => join(repo, ...p);
  const sync = (...args: string[]) =>
    execFileSync("node", [at("event-storming/scripts/sync-factory.mjs"), ...args], { encoding: "utf8" });

  beforeAll(() => {
    repo = mkdtempSync(join(tmpdir(), "es-factory-"));
    for (const dir of ["factory", "scripts"]) cpSync(join(projectRoot, dir), at("event-storming", dir), { recursive: true });
    mkdirSync(at(".github/agents"), { recursive: true });
    writeFileSync(at(".github/agents/gm-leurre.agent.md"), "fichier d'un autre projet\n");
    sync();
  });
  afterAll(() => rmSync(repo, { recursive: true, force: true }));

  it("ne supprime pas les fichiers générés d'un autre projet", () => {
    expect(existsSync(at(".github/agents/gm-leurre.agent.md"))).toBe(true);
  });

  it("génère les agents Copilot avec le préfixe es-", () => {
    expect(readdirSync(at(".github/agents")).filter((f) => f.startsWith("es-"))).toHaveLength(16);
  });

  it("génère le fichier d'instructions Copilot du projet", () => {
    expect(existsSync(at(".github/instructions/event-storming.instructions.md"))).toBe(true);
  });

  it("génère la commande Claude /es-feature", () => {
    expect(existsSync(at("event-storming/.claude/commands/es-feature.md"))).toBe(true);
  });

  it("est stable : --check réussit juste après une synchronisation", () => {
    expect(sync("--check")).toContain("OK : 71 fichiers générés à jour.");
  });
});
