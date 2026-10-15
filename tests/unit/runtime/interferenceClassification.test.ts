import { describe, expect, it } from 'vitest';
import { classifyInterferencePairs, summarizeInterferencePairs } from '../../../src/modeling/runtime/interferenceClassification';
import { CONTACT_THICKNESS_MM, INTERPENETRATION_EPSILON_MM3 } from '../../../src/modeling/runtime/jointContactCap';

describe('interference classification', () => {
  it('classifies face-contact slivers and sub-epsilon volumes as contact noise', () => {
    const result = classifyInterferencePairs([
      { a: 'palm-root', b: 'index-proximal', volumeMm3: 0.5, thicknessMm: CONTACT_THICKNESS_MM / 2 },
      { a: 'index-proximal', b: 'index-middle', volumeMm3: INTERPENETRATION_EPSILON_MM3 },
    ]);

    expect(result.map((pair) => pair.classification)).toEqual(['contact-noise', 'contact-noise']);
    expect(result.map((pair) => pair.actionable)).toEqual([false, false]);
  });

  it('classifies a thick overlap as actionable at any volume above the floor', () => {
    const result = classifyInterferencePairs([
      { a: 'servo', b: 'palm-root', volumeMm3: 0.02, thicknessMm: 0.05 },
    ]);

    expect(result).toEqual([
      {
        a: 'servo',
        b: 'palm-root',
        volumeMm3: 0.02,
        thicknessMm: 0.05,
        capMm3: INTERPENETRATION_EPSILON_MM3,
        contactThicknessMm: CONTACT_THICKNESS_MM,
        classification: 'actionable',
        actionable: true,
      },
    ]);
  });

  it('summarizes raw, contact-noise, and actionable counts', () => {
    expect(summarizeInterferencePairs([
      { a: 'a', b: 'b', volumeMm3: 1, thicknessMm: 0.001 },
      { a: 'c', b: 'd', volumeMm3: 1, thicknessMm: 0.5 },
    ])).toMatchObject({
      rawCount: 2,
      contactNoiseCount: 1,
      actionableCount: 1,
      capMm3: INTERPENETRATION_EPSILON_MM3,
      contactThicknessMm: CONTACT_THICKNESS_MM,
    });
  });
});
