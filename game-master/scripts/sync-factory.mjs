#!/usr/bin/env node
// Génère les fichiers d'agents/commandes de chaque outil depuis factory/ (ADR-0013).
// Usage : node scripts/sync-factory.mjs [--check]
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(root, ".."); // monorepo : .github/ vit à la racine du dépôt
const check = process.argv.includes("--check");
const models = JSON.parse(readFileSync(join(root, "factory/models.json"), "utf8"));

const TOOLS = {
  read: ["Read", "Glob", "Grep"],
  review: ["Read", "Glob", "Grep", "Bash"],
  write: ["Read", "Glob", "Grep", "Bash", "Edit", "Write"],
};
const COPILOT_TOOLS = { read: ["read", "search"], review: ["read", "search", "execute"], write: ["read", "search", "execute", "edit"] };
const SANDBOX = { read: "read-only", review: "read-only", write: "workspace-write" };
const EFFORTS = ["low", "medium", "high", "xhigh"];

function parse(file) {
  const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!m) throw new Error(`${file}: frontmatter manquant`);
  const meta = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: m[2].trim() };
}

const q = (s) => JSON.stringify(s); // chaîne valide en YAML et en TOML (basique)
const md = (front, body, note) => `---\n${front.join("\n")}\n---\n<!-- GÉNÉRÉ par scripts/sync-factory.mjs depuis ${note} — ne pas éditer -->\n\n${body}\n`;

const agents = readdirSync(join(root, "factory/agents")).filter((f) => f.endsWith(".md")).sort().map((f) => {
  const { meta, body } = parse(join(root, "factory/agents", f));
  const { name, description, effort, access } = meta;
  if (!name || !description || !EFFORTS.includes(effort) || !TOOLS[access]) throw new Error(`${f}: frontmatter invalide`);
  return { name, description, effort, access, body, src: `factory/agents/${f}` };
});
const workflows = readdirSync(join(root, "factory/workflows")).filter((f) => f.endsWith(".md")).sort().map((f) => {
  const { meta } = parse(join(root, "factory/workflows", f));
  return { name: f.replace(/\.md$/, ""), description: meta.description, src: `factory/workflows/${f}` };
});

const out = new Map(); // chemin absolu -> contenu

for (const a of agents) {
  const note = a.src;
  const readOnly = a.access !== "write" ? "\n\nAccès : lecture seule — ne modifie aucun fichier du dépôt." : "";
  const effortNote = `Effort de raisonnement cible : ${a.effort} (non configurable dans cet outil).\n\n`;

  // Claude Code
  const cm = models.claude;
  out.set(join(root, ".claude/agents", `${a.name}.md`), md([
    `name: ${a.name}`, `description: ${q(a.description)}`, `tools: ${TOOLS[a.access].join(", ")}`,
    ...(cm.model?.[a.effort] ? [`model: ${cm.model[a.effort]}`] : []),
    ...(cm.effort?.[a.effort] ? [`effort: ${cm.effort[a.effort]}`] : []),
  ], a.body, note));

  // Codex
  const cx = models.codex;
  out.set(join(root, ".codex/agents", `${a.name}.toml`), [
    `# GÉNÉRÉ par scripts/sync-factory.mjs depuis ${note} — ne pas éditer`,
    `name = ${q(a.name)}`, `description = ${q(a.description)}`,
    ...(cx.model ? [`model = ${q(cx.model)}`] : []),
    ...(cx.effort?.[a.effort] ? [`model_reasoning_effort = ${q(cx.effort[a.effort])}`] : []),
    `sandbox_mode = ${q(SANDBOX[a.access])}`,
    `developer_instructions = '''`, a.body, `'''`, ``,
  ].join("\n"));

  // Gemini CLI
  out.set(join(root, ".gemini/agents", `${a.name}.md`), md([
    `name: ${a.name}`, `description: ${q(a.description)}`,
    ...(models.gemini.model ? [`model: ${models.gemini.model}`] : []),
  ], effortNote + a.body + readOnly, note));

  // GitHub Copilot (racine du dépôt)
  out.set(join(repoRoot, ".github/agents", `gm-${a.name}.agent.md`), md([
    `name: ${q(`gm-${a.name}`)}`, `description: ${q(a.description)}`, `tools: ${JSON.stringify(COPILOT_TOOLS[a.access])}`,
    ...(models.copilot.model ? [`model: ${q(models.copilot.model)}`] : []),
  ], effortNote + `Racine du projet : \`game-master/\`.\n\n` + a.body + readOnly, note));
}

for (const w of workflows) {
  const instr = `Exécute le workflow défini dans \`factory/workflows/${w.name}.md\` (lis-le en entier et suis chaque phase et chaque porte). Les agents sont décrits dans \`factory/agents/\`. Règle absolue : n'invente rien, pose la question.`;
  out.set(join(root, ".claude/commands", `gm-${w.name}.md`), md([`description: ${q(w.description)}`, `argument-hint: "<arguments>"`], `${instr}\n\nArguments : $ARGUMENTS`, w.src));
  out.set(join(root, ".gemini/commands", `gm-${w.name}.toml`), [
    `# GÉNÉRÉ par scripts/sync-factory.mjs depuis ${w.src} — ne pas éditer`,
    `description = ${q(w.description)}`, `prompt = '''`, `${instr}\n\nArguments : {{args}}`, `'''`, ``,
  ].join("\n"));
  out.set(join(repoRoot, ".github/prompts", `gm-${w.name}.prompt.md`), md([`description: ${q(w.description)}`, `agent: agent`],
    `${instr.replaceAll("`factory/", "`game-master/factory/")}\n\nArguments : \${input:request:Besoin ou cible}`, w.src));
}

out.set(join(repoRoot, ".github/instructions/game-master.instructions.md"), md([`applyTo: "game-master/**"`],
  "Lis et applique `game-master/AGENTS.md` (règles, ADR, guidelines). Ne jamais éditer les fichiers générés ; modifier `game-master/factory/` puis `npm run factory:sync`.", "AGENTS.md"));

// Fichiers obsolètes (générés mais plus attendus)
const stale = [];
const scan = (dir, pred) => existsSync(dir) && readdirSync(dir).filter(pred).forEach((f) => { const p = join(dir, f); if (!out.has(p)) stale.push(p); });
for (const d of [".claude/agents", ".claude/commands", ".codex/agents", ".gemini/agents", ".gemini/commands"]) scan(join(root, d), () => true);
for (const d of [".github/agents", ".github/prompts"]) scan(join(repoRoot, d), (f) => f.startsWith("gm-"));

const norm = (s) => s.replace(/\r\n/g, "\n");
const drift = [];
for (const [path, content] of out) {
  const current = existsSync(path) ? norm(readFileSync(path, "utf8")) : null;
  if (current !== content) drift.push(path);
  if (!check && current !== content) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content); }
}
if (!check) stale.forEach((p) => rmSync(p));

const rel = (p) => relative(repoRoot, p).replaceAll("\\", "/");
if (check && (drift.length || stale.length)) {
  console.error("Fichiers générés désynchronisés — lancer `npm run factory:sync` :");
  [...drift, ...stale].forEach((p) => console.error(`  ${rel(p)}`));
  process.exit(1);
}
console.log(check ? `OK : ${out.size} fichiers générés à jour.` : `Synchronisé : ${out.size} fichiers (${drift.length} modifiés, ${stale.length} supprimés).`);
