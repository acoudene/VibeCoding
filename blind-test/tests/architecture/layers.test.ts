import { readFile } from "node:fs/promises";
import path from "node:path";

import { glob } from "tinyglobby";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(ROOT, "src");

type LayerRule = {
  layer: string;
  pattern: string;
  forbidden: string[];
};

const RULES: LayerRule[] = [
  {
    layer: "domain",
    pattern: "src/domain/**/*.{ts,tsx}",
    forbidden: ["@/application", "@/infrastructure", "@/app"],
  },
  {
    layer: "application",
    pattern: "src/application/**/*.{ts,tsx}",
    forbidden: ["@/infrastructure", "@/app"],
  },
];

// Maps each forbidden alias to the exact src/<dir> segment it represents.
// We match on full path segments (e.g. "/src/app/" not just "/app/") to avoid
// confusing src/app with src/application or other "app*" prefixed folders.
const RELATIVE_EQUIVALENTS: Record<string, string> = {
  "@/application": "src/application",
  "@/infrastructure": "src/infrastructure",
  "@/app": "src/app",
};

const IMPORT_LINE = /^\s*(?:import\s[^;]*?from\s+|import\s+)["']([^"']+)["']/gm;
const REQUIRE_LINE = /\brequire\(\s*["']([^"']+)["']\s*\)/g;

async function findFiles(pattern: string): Promise<string[]> {
  return glob(pattern, { cwd: ROOT, absolute: true });
}

function violatesAlias(specifier: string, forbiddenAlias: string): boolean {
  return specifier === forbiddenAlias || specifier.startsWith(`${forbiddenAlias}/`);
}

function violatesRelative(specifier: string, importerDir: string, forbiddenAlias: string): boolean {
  if (!specifier.startsWith(".")) return false;
  const resolved = path.resolve(importerDir, specifier).replace(/\\/g, "/");
  const segment = RELATIVE_EQUIVALENTS[forbiddenAlias]!;
  // Exact path-segment match: "/src/app/" or trailing "/src/app".
  return resolved.includes(`/${segment}/`) || resolved.endsWith(`/${segment}`);
}

function extractSpecifiers(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(IMPORT_LINE)) out.push(m[1]!);
  for (const m of source.matchAll(REQUIRE_LINE)) out.push(m[1]!);
  return out;
}

describe("layered architecture", () => {
  for (const rule of RULES) {
    it(`${rule.layer} files do not import forbidden layers`, async () => {
      const files = await findFiles(rule.pattern);
      const violations: string[] = [];

      for (const file of files) {
        const source = await readFile(file, "utf8");
        const specifiers = extractSpecifiers(source);
        const importerDir = path.dirname(file);

        for (const spec of specifiers) {
          for (const forbidden of rule.forbidden) {
            if (violatesAlias(spec, forbidden) || violatesRelative(spec, importerDir, forbidden)) {
              violations.push(
                `${path.relative(ROOT, file)}: imports "${spec}" (forbidden: ${forbidden})`,
              );
            }
          }
        }
      }

      expect(violations, `\n${violations.join("\n")}`).toEqual([]);
    });
  }

  it("src directory structure exists or rule files match nothing (no false greens)", async () => {
    const srcExists = await readFile(path.join(SRC, "app/layout.tsx"), "utf8")
      .then(() => true)
      .catch(() => false);
    expect(srcExists, "src/app/layout.tsx must exist as a sentinel").toBe(true);
  });
});
