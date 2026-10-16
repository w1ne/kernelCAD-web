// tests/unit/skill/_helpers.ts
//
// Shared helpers for SKILL.md drift sentinels. Each sentinel imports a
// canonical source (TOOLS / SHAPE_METHODS / SKETCH_METHODS / GLOBALS /
// PATH_BUILDER_METHODS / HINTS keys) and asserts SKILL.md mentions
// every entry with word-boundary precision.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SKILLS_ROOT = resolvePath(__dirname, '../../../src/agent/skills');

/**
 * One skill's documentation: its SKILL.md followed by its `references/*.md`
 * (the lean-SKILL.md layout moves detail into reference files the skill links
 * to; a drift sentinel must see both).
 */
export function loadSkillDocs(name: string): string {
  const dir = join(SKILLS_ROOT, name);
  const refsDir = join(dir, 'references');
  const refs = existsSync(refsDir) && statSync(refsDir).isDirectory()
    ? readdirSync(refsDir).filter((f) => f.endsWith('.md')).sort().map((f) => readFileSync(join(refsDir, f), 'utf8'))
    : [];
  return [readFileSync(join(dir, 'SKILL.md'), 'utf8'), ...refs].join('\n\n');
}

/**
 * Load all skill SKILL.md files (plus their references) from src/agent/skills/
 * and concatenate them. Mirrors src/agent/cli/commands/skill.ts renderOnefile().
 */
export function loadCombinedSkillMd(): string {
  const dirs = readdirSync(SKILLS_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(SKILLS_ROOT, e.name, 'SKILL.md')))
    .map((e) => e.name)
    .sort();
  return dirs.map((name) => loadSkillDocs(name)).join('\n\n---\n\n');
}

/**
 * Escape regex special characters for safe inclusion in a RegExp source.
 */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Assert SKILL.md mentions every name from `names`. Uses word-boundary
 * regex (`\b<name>\b`) to avoid substring false-positives. Failure
 * message names the missing entries and points contributors at the
 * relevant section.
 */
export function assertEveryNameInSKILL(
  skillMd: string,
  names: readonly string[],
  kindLabel: string,  // e.g. "Shape methods", "MCP tools", "diagnostic codes"
): void {
  const missing: string[] = [];
  for (const name of names) {
    const regex = new RegExp(`\\b${escapeRegExp(name)}\\b`);
    if (!regex.test(skillMd)) {
      missing.push(name);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `SKILL.md does not mention these ${kindLabel}. ` +
      `Add an entry to the corresponding section: ${missing.join(', ')}`,
    );
  }
}
