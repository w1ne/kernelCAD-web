import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GLOBALS } from '../../../src/mcp/tools/listApi';
import { escapeRegExp } from './_helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_MD = readFileSync(
  resolvePath(__dirname, '../../../src/skill/SKILL.md'),
  'utf8',
);

describe('SKILL.md GLOBALS drift sentinel', () => {
  it('every GLOBALS entry name appears in SKILL.md (word-boundary match)', () => {
    const missing: string[] = [];
    for (const entry of GLOBALS) {
      const regex = new RegExp(`\\b${escapeRegExp(entry.name)}\\b`);
      if (!regex.test(SKILL_MD)) {
        missing.push(entry.name);
      }
    }
    expect(
      missing,
      `SKILL.md does not mention these top-level globals. Add an entry to the Top-level functions section: ${missing.join(', ')}`,
    ).toEqual([]);
  });
});
