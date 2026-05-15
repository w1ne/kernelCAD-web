import { describe, expect, it } from 'vitest';
import { loadCombinedSkillMd } from './_helpers';

const SKILL_MD = loadCombinedSkillMd();

function outOfScopeSection(): string {
  const match = SKILL_MD.match(/## Out of Scope\n([\s\S]*?)(?:\n## |\n<!-- COOKBOOK:START -->)/);
  expect(match, 'SKILL.md must contain an Out of Scope section').not.toBeNull();
  return match![1];
}

describe('SKILL.md Out of Scope truth sentinel', () => {
  it('does not list shipped modeling capabilities as deferred', () => {
    const outOfScope = outOfScopeSection();

    const shippedCapabilityPatterns = [
      /\bHole\b/i,
      /\bcutout\b/i,
      /\bAssemblies\b/i,
      /\bjoints\b/i,
    ];

    for (const pattern of shippedCapabilityPatterns) {
      expect(outOfScope, `Out of Scope still contains shipped capability pattern ${pattern}`).not.toMatch(pattern);
    }
  });
});
