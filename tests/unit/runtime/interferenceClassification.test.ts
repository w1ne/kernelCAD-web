import { describe, expect, it } from 'vitest';
import { classifyInterferencePairs, summarizeInterferencePairs } from '../../../src/modeling/runtime/interferenceClassification';
import { jointContactCapMm3 } from '../../../src/modeling/runtime/jointContactCap';

describe('interference classification', () => {
  it('classifies raw pairs below or equal to the cap as contact noise', () => {
    const cap = jointContactCapMm3();

    const result = classifyInterferencePairs([
      { a: 'palm-root', b: 'index-proximal', volumeMm3: 0.5 },
      { a: 'index-proximal', b: 'index-middle', volumeMm3: cap },
    ]);

    expect(result.map((pair) => pair.classification)).toEqual(['contact-noise', 'contact-noise']);
    expect(result.map((pair) => pair.actionable)).toEqual([false, false]);
  });

  it('classifies raw pairs above the cap as actionable', () => {
    const cap = jointContactCapMm3();

    const result = classifyInterferencePairs([
      { a: 'servo', b: 'palm-root', volumeMm3: cap + 0.01 },
    ]);

    expect(result).toEqual([
      {
        a: 'servo',
        b: 'palm-root',
        volumeMm3: cap + 0.01,
        capMm3: cap,
        classification: 'actionable',
        actionable: true,
      },
    ]);
  });

  it('summarizes raw, contact-noise, and actionable counts', () => {
    const cap = jointContactCapMm3();

    expect(summarizeInterferencePairs([
      { a: 'a', b: 'b', volumeMm3: 1 },
      { a: 'c', b: 'd', volumeMm3: cap + 1 },
    ])).toMatchObject({
      rawCount: 2,
      contactNoiseCount: 1,
      actionableCount: 1,
      capMm3: cap,
    });
  });
});
