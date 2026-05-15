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

/**
 * Load all skill SKILL.md files from src/skills/ and concatenate them.
 * Mirrors the logic in src/cli/commands/skill.ts renderOnefile().
 */
export function loadCombinedSkillMd(): string {
  const skillsRoot = resolvePath(__dirname, '../../../src/skills');
  const dirs = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(skillsRoot, e.name, 'SKILL.md')))
    .map((e) => e.name)
    .sort();
  return dirs
    .map((name) => readFileSync(join(skillsRoot, name, 'SKILL.md'), 'utf8'))
    .join('\n\n---\n\n');
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
