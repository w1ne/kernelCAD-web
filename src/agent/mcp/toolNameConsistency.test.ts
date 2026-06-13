import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { TOOLS } from './toolRegistry';
import { RETIRED_TOOL_NAMES } from './retiredToolNames';

// Repo root relative to this file: src/agent/mcp → ../../../
const ROOT = resolve(__dirname, '../../../');

/** Directories whose files reference MCP tool names by bare/backticked string. */
const REFERENCE_DIRS = ['src/agent/skills', 'eval', 'docs'];
const REFERENCE_EXTS = ['.md', '.ts', '.json'];

function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc; // dir absent in this checkout — skip
  }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (REFERENCE_EXTS.some(e => name.endsWith(e))) acc.push(full);
  }
  return acc;
}

function referenceFiles(): string[] {
  return REFERENCE_DIRS.flatMap(d => walk(join(ROOT, d)));
}

describe('tool-name consistency', () => {
  it('no reference surface mentions a retired tool name', () => {
    const retired = Object.keys(RETIRED_TOOL_NAMES);
    if (retired.length === 0) return; // nothing retired yet
    const patterns = retired.map(n => [n, new RegExp(`\\b${n}\\b`)] as const);
    const offenders: string[] = [];
    for (const file of referenceFiles()) {
      const text = readFileSync(file, 'utf8');
      for (const [name, re] of patterns) {
        if (re.test(text)) {
          offenders.push(`${file.replace(ROOT + '/', '')}: '${name}' → ${RETIRED_TOOL_NAMES[name]}`);
        }
      }
    }
    expect(
      offenders,
      `Retired tool names still referenced in teaching surfaces:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('no surviving tool description references a retired tool name', () => {
    const retired = Object.keys(RETIRED_TOOL_NAMES);
    if (retired.length === 0) return;
    const offenders: string[] = [];
    for (const tool of TOOLS) {
      const text = JSON.stringify(tool); // name + description + schema prose
      for (const name of retired) {
        if (new RegExp(`\\b${name}\\b`).test(text)) {
          offenders.push(`tool '${tool.name}' references retired '${name}' → ${RETIRED_TOOL_NAMES[name]}`);
        }
      }
    }
    expect(offenders, `Retired names leaked into live tool definitions:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('every registry tool name is unique and snake_case', () => {
    const names = TOOLS.map(t => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n).toMatch(/^[a-z][a-z0-9_]*$/);
  });
});
