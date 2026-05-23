// src/agent/cli/lib/walkSkillTree.ts
//
// Depth-unbounded SKILL.md discoverer. Shared by the legacy
// `kernelcad skill install` command and the dist-publish generator.
// Returns deterministic, sort-stable entries so generator output is
// reproducible across machines.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface SkillEntry {
  /** Absolute path to the SKILL.md file. */
  absPath: string;
  /** Path relative to the walk root, POSIX-style (forward slashes). */
  relPath: string;
  /** Frontmatter parsed from the file head. */
  frontmatter: { name: string; description: string };
  /** Raw file body (everything after the closing `---`). */
  body: string;
  /** Raw file source (frontmatter + body). */
  source: string;
}

export function walkSkillTree(root: string): SkillEntry[] {
  const hits: SkillEntry[] = [];
  walkInto(root, root, hits);
  hits.sort((a, b) => (a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0));
  return hits;
}

function walkInto(root: string, dir: string, out: SkillEntry[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkInto(root, full, out);
      continue;
    }
    if (entry.isFile() && entry.name === 'SKILL.md') {
      out.push(parseEntry(root, full));
    }
  }
}

function parseEntry(root: string, absPath: string): SkillEntry {
  const source = readFileSync(absPath, 'utf8');
  const fm = parseFrontmatter(source, absPath);
  const body = source.replace(/^---[\s\S]*?---\n?/, '');
  return {
    absPath,
    relPath: relative(root, absPath).split(/[\\/]/).join('/'),
    frontmatter: fm,
    body,
    source,
  };
}

function parseFrontmatter(source: string, absPath: string): { name: string; description: string } {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(source);
  if (!m) throw new Error(`${absPath}: missing YAML frontmatter (--- ... --- header).`);
  const block = m[1];
  const name = /^name:\s*(.+)$/m.exec(block)?.[1]?.trim();
  const description = /^description:\s*(.+)$/m.exec(block)?.[1]?.trim();
  if (!name) throw new Error(`${absPath}: frontmatter is missing required key 'name'.`);
  if (!description) throw new Error(`${absPath}: frontmatter is missing required key 'description'.`);
  return { name, description };
}
