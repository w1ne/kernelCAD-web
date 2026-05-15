import { describe, it } from 'vitest';
import { PATH_BUILDER_METHODS } from '../../../src/mcp/tools/listApi';
import { assertEveryNameInSKILL, loadCombinedSkillMd } from './_helpers';

const SKILL_MD = loadCombinedSkillMd();

describe('SKILL.md PathBuilder methods drift sentinel', () => {
  it('every PATH_BUILDER_METHODS entry name appears in SKILL.md (word-boundary match)', () => {
    const names = PATH_BUILDER_METHODS.map((e) => e.name);
    assertEveryNameInSKILL(SKILL_MD, names, 'PathBuilder methods');
  });
});
