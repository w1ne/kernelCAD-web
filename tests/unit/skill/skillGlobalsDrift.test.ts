import { describe, it } from 'vitest';
import { GLOBALS } from '../../../src/agent/mcp/tools/listApi';
import { assertEveryNameInSKILL, loadCombinedSkillMd } from './_helpers';

const SKILL_MD = loadCombinedSkillMd();

describe('SKILL.md GLOBALS drift sentinel', () => {
  it('every GLOBALS entry name appears in SKILL.md (word-boundary match)', () => {
    const names = GLOBALS.map((e) => e.name);
    assertEveryNameInSKILL(SKILL_MD, names, 'top-level globals');
  });
});
