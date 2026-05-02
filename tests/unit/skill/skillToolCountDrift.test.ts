import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOLS } from '../../../src/mcp/server';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_MD = readFileSync(
  resolvePath(__dirname, '../../../src/skill/SKILL.md'),
  'utf8',
);

describe('SKILL.md tool count drift sentinel', () => {
  it('the documented MCP tool count matches the actual TOOLS array length', () => {
    // Catches the rc.6/8/12 class of drift where new MCP tools shipped but
    // SKILL.md still claimed an old count. Agents read SKILL.md as their
    // primary skill doc; if it under-counts, agents won't look for the
    // missing tools.
    const actualCount = TOOLS.length;

    // Find a count mention in SKILL.md. The doc may say "<N> tools" or
    // "<N> MCP tools" or "exposes <N> tools" — match any digit followed by
    // " tools" (or " MCP tools").
    const countPattern = /(\d+)\s+(MCP\s+)?tools/i;
    const match = SKILL_MD.match(countPattern);
    expect(match, 'SKILL.md must mention a tool count').not.toBeNull();
    const documentedCount = Number(match![1]);

    expect(documentedCount, `SKILL.md says ${documentedCount} tools but TOOLS array has ${actualCount}`).toBe(actualCount);
  });

  it('every TOOLS entry is mentioned by name somewhere in SKILL.md', () => {
    // Soft check: every tool's name should appear in SKILL.md at least
    // once. Catches the case where TOOLS adds a new entry but SKILL.md
    // doesn't get updated to describe it. Word-boundary regex avoids
    // false-positives when a tool name is a substring of a longer identifier.
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const missing: string[] = [];
    for (const tool of TOOLS) {
      const name = (tool as { name: string }).name;
      const regex = new RegExp(`\\b${escapeRegExp(name)}\\b`);
      if (!regex.test(SKILL_MD)) {
        missing.push(name);
      }
    }
    expect(missing, `Tools missing from SKILL.md: ${missing.join(', ')}`).toEqual([]);
  });
});
