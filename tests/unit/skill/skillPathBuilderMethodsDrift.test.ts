import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATH_BUILDER_METHODS } from '../../../src/mcp/tools/listApi';
import { escapeRegExp } from './_helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_MD = readFileSync(
  resolvePath(__dirname, '../../../src/skill/SKILL.md'),
  'utf8',
);

describe('SKILL.md PathBuilder methods drift sentinel', () => {
  it('every PATH_BUILDER_METHODS entry name appears in SKILL.md (word-boundary match)', () => {
    const missing: string[] = [];
    for (const entry of PATH_BUILDER_METHODS) {
      const regex = new RegExp(`\\b${escapeRegExp(entry.name)}\\b`);
      if (!regex.test(SKILL_MD)) {
        missing.push(entry.name);
      }
    }
    expect(
      missing,
      `SKILL.md does not mention these PathBuilder methods. Add an entry to the PathBuilder methods section: ${missing.join(', ')}`,
    ).toEqual([]);
  });
});
