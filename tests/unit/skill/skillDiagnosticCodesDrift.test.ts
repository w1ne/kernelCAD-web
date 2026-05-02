import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HINTS } from '../../../src/mcp/tools/whyDidThisFail';
import { escapeRegExp } from './_helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_MD = readFileSync(
  resolvePath(__dirname, '../../../src/skill/SKILL.md'),
  'utf8',
);

describe('SKILL.md diagnostic codes drift sentinel', () => {
  it('every HINTS code appears in SKILL.md (word-boundary match)', () => {
    const codes = Object.keys(HINTS);
    const missing: string[] = [];
    for (const code of codes) {
      const regex = new RegExp(`\\b${escapeRegExp(code)}\\b`);
      if (!regex.test(SKILL_MD)) {
        missing.push(code);
      }
    }
    expect(
      missing,
      `SKILL.md does not mention these diagnostic codes. Add to the diagnostic-codes table: ${missing.join(', ')}`,
    ).toEqual([]);
  });
});
