import { describe, expect, it } from 'vitest';
import { loadCombinedSkillMd } from './_helpers';

const SKILL_MD = loadCombinedSkillMd();

describe('SKILL.md fresh-agent mechanism loop docs', () => {
  it('documents the mechanism build loop and critical review tools', () => {
    // The skill tree uses "Fresh-agent mechanism loop" as the section heading.
    expect(SKILL_MD).toMatch(/Fresh-agent mechanism loop/);
    expect(SKILL_MD).toMatch(/inspect_assembly\(\{ file\? \| code\?, assembly\? \}\)/);
    expect(SKILL_MD).toMatch(/review_cad\(\{ file\? \| code\?/);
    expect(SKILL_MD).toMatch(/design_loop\(\{ goal, attempts/);
    expect(SKILL_MD).toMatch(/arm\.transmission\(name/);
    expect(SKILL_MD).toMatch(/assembly\.transmission\.missing-for-coupled-mate/);
    expect(SKILL_MD).toMatch(/assembly\.transmission\.path-disconnected/);
    expect(SKILL_MD).toMatch(/unexplainedGeometry/);
    expect(SKILL_MD).toMatch(/connector-not-in-solid/);
    expect(SKILL_MD).toMatch(/missing mate contact/);
  });

  it('does not advertise a stale fixed MCP tool count', () => {
    expect(SKILL_MD).not.toMatch(/exposes \d+ tools/);
  });
});
