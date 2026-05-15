import { describe, it } from 'vitest';
import { SKETCH_METHODS } from '../../../src/mcp/tools/listApi';
import { assertEveryNameInSKILL, loadCombinedSkillMd } from './_helpers';

const SKILL_MD = loadCombinedSkillMd();

describe('SKILL.md Sketch methods drift sentinel', () => {
  it('every SKETCH_METHODS entry name appears in SKILL.md (word-boundary match)', () => {
    const names = SKETCH_METHODS.map((m) => m.name);
    assertEveryNameInSKILL(SKILL_MD, names, 'Sketch methods');
  });
});
