import { describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATH_BUILDER_METHODS } from '../../../src/mcp/tools/listApi';
import { assertEveryNameInSKILL } from './_helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_MD = readFileSync(
  resolvePath(__dirname, '../../../src/skill/SKILL.md'),
  'utf8',
);

describe('SKILL.md PathBuilder methods drift sentinel', () => {
  it('every PATH_BUILDER_METHODS entry name appears in SKILL.md (word-boundary match)', () => {
    const names = PATH_BUILDER_METHODS.map((e) => e.name);
    assertEveryNameInSKILL(SKILL_MD, names, 'PathBuilder methods');
  });
});
