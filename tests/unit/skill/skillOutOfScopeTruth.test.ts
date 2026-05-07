import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_MD = readFileSync(
  resolvePath(__dirname, '../../../src/skill/SKILL.md'),
  'utf8',
);

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
