import { describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HINTS } from '../../../src/mcp/tools/whyDidThisFail';
import { assertEveryNameInSKILL } from './_helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_MD = readFileSync(
  resolvePath(__dirname, '../../../src/skill/SKILL.md'),
  'utf8',
);

describe('SKILL.md diagnostic codes drift sentinel', () => {
  it('every HINTS code appears in SKILL.md (word-boundary match)', () => {
    const codes = Object.keys(HINTS);
    assertEveryNameInSKILL(SKILL_MD, codes, 'diagnostic codes');
  });
});
