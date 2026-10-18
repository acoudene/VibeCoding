import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../../..");

function markdownFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return markdownFiles(path);
    return path.endsWith(".md") ? [path] : [];
  });
}

// Sources lues par les agents de la factory (les fichiers générés en dérivent, cf. factory:check).
const agentSources = ["factory", "docs/guidelines", ".specify"].flatMap((dir) => markdownFiles(join(projectRoot, dir)));

describe("résidus du socle game-master", () => {
  it("chaque ADR cité par nom de fichier existe dans docs/adr", () => {
    const missing = agentSources.flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/\b(\d{4}-[a-z0-9-]+\.md)\b/g)]
        .map((m) => m[1]!)
        .filter((adr) => !existsSync(join(projectRoot, "docs/adr", adr)))
        .map((adr) => `${file}: ${adr}`),
    );
    expect(missing).toEqual([]);
  });

  it("aucun concept de jeu de rôle ne subsiste dans les sources des agents", () => {
    const rpg = /\b(SRD|JdR|D&D|joueurs?|personnages?|dés|jets?|DD|narre|DiceRoller|parseCheckRequest|MJ)\b/;
    const hits = agentSources.flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .map((line, i) => ({ line, i }))
        .filter(({ line }) => rpg.test(line))
        .map(({ line, i }) => `${file}:${i + 1}: ${line.trim()}`),
    );
    expect(hits).toEqual([]);
  });
});
