import { describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHAPE_METHODS } from '../../../src/mcp/tools/listApi';
import { assertEveryNameInSKILL } from './_helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_MD = readFileSync(
  resolvePath(__dirname, '../../../src/skill/SKILL.md'),
  'utf8',
);

describe('SKILL.md Shape methods drift sentinel', () => {
  it('every SHAPE_METHODS entry name appears in SKILL.md (word-boundary match)', () => {
    const names = SHAPE_METHODS.map((m) => m.name);
    assertEveryNameInSKILL(SKILL_MD, names, 'Shape methods');
  });
});
