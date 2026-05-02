import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHAPE_METHODS } from '../../../src/mcp/tools/listApi';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_MD = readFileSync(
  resolvePath(__dirname, '../../../src/skill/SKILL.md'),
  'utf8',
);

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('SKILL.md Shape methods drift sentinel', () => {
  it('every SHAPE_METHODS entry name appears in SKILL.md (word-boundary match)', () => {
    const missing: string[] = [];
    for (const method of SHAPE_METHODS) {
      const regex = new RegExp(`\\b${escapeRegExp(method.name)}\\b`);
      if (!regex.test(SKILL_MD)) {
        missing.push(method.name);
      }
    }
    expect(
      missing,
      `SKILL.md does not mention these Shape methods. Add an entry to the corresponding section: ${missing.join(', ')}`,
    ).toEqual([]);
  });
});
