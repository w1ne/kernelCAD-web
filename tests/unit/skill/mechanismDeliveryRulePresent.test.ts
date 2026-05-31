import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SKILL_PATHS = [
  'src/agent/skills/kernelcad-kinematic/SKILL.md',
  'src/agent/skills/kernelcad-assemblies/SKILL.md',
];

const REQUIRED_HEADING = '## Mechanism delivery — non-bypassable';
const REQUIRED_PHRASES = [
  '**not deliverable**',
  'may not be ignored',
  'Gate 6 (mate physical realization)',
  'Gate 4 (visual exposure)',
  'render-inspect loop',
];
const REQUIRED_ITEM_ORDER = [
  '1. `kernelcad validate --include-interference` returns CLEAN',
  '2. Every declared mate passes Gate 6',
  '3. Every revolute joint passes Gate 4',
  '4. The render-inspect loop',
];

describe('Mechanism delivery non-deliverable rule must be present in kinematic SKILLs', () => {
  for (const path of SKILL_PATHS) {
    describe(path, () => {
      const text = readFileSync(path, 'utf8');

      it('contains the canonical section heading', () => {
        expect(text).toContain(REQUIRED_HEADING);
      });

      for (const phrase of REQUIRED_PHRASES) {
        it(`contains required phrase "${phrase.slice(0, 40)}…"`, () => {
          expect(text).toContain(phrase);
        });
      }

      it('contains the four rule items in order', () => {
        const indices = REQUIRED_ITEM_ORDER.map((item) => text.indexOf(item));
        for (const [i, idx] of indices.entries()) {
          expect(idx, `item ${i + 1} not found: ${REQUIRED_ITEM_ORDER[i]}`).toBeGreaterThan(-1);
        }
        const sorted = [...indices].sort((a, b) => a - b);
        expect(indices).toEqual(sorted);
      });
    });
  }
});
