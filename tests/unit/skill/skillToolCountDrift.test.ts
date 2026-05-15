import { describe, it } from 'vitest';
import { TOOLS } from '../../../src/mcp/server';
import { assertEveryNameInSKILL, loadCombinedSkillMd } from './_helpers';

const SKILL_MD = loadCombinedSkillMd();

describe('SKILL.md tool count drift sentinel', () => {
  // The skill tree design deliberately removes a fixed tool-count literal from
  // the docs to avoid stale counts. Coverage that all tool names appear is
  // sufficient — see skillMechanismLoopDocs "does not advertise a stale fixed
  // MCP tool count" for the complementary assertion.

  it('every TOOLS entry is mentioned by name somewhere in SKILL.md', () => {
    // Soft check: every tool's name should appear in SKILL.md at least
    // once. Catches the case where TOOLS adds a new entry but the skill tree
    // doesn't get updated to describe it. Word-boundary regex avoids
    // false-positives when a tool name is a substring of a longer identifier.
    const names = TOOLS.map((tool) => (tool as { name: string }).name);
    assertEveryNameInSKILL(SKILL_MD, names, 'MCP tools');
  });
});
