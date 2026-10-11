import { describe, expect, it } from 'vitest';
import { classifyInterferencePairs, summarizeInterferencePairs } from '../../../src/modeling/runtime/interferenceClassification';
import { jointContactCapMm3, pairContactCapMm3 } from '../../../src/modeling/runtime/jointContactCap';
import { annotateRunningFits, runningFitPairKeys } from '../../../src/modeling/runtime/detectInterferences';

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

  it('scales the cap with the smaller part only across a moving (running-fit) joint', () => {
    // ~2400 mm³ hinge leaves: 0.2 % → ~4.8 mm³.
    const leaves = { smallerPartVolumeMm3: 2400 };
    expect(pairContactCapMm3({ ...leaves, runningFit: true })).toBeCloseTo(4.8, 6);
    expect(pairContactCapMm3(leaves)).toBe(jointContactCapMm3());
    // floor and ceiling
    expect(pairContactCapMm3({ smallerPartVolumeMm3: 50, runningFit: true })).toBe(1);
    expect(pairContactCapMm3({ smallerPartVolumeMm3: 1e6, runningFit: true })).toBe(jointContactCapMm3());
    expect(pairContactCapMm3({ runningFit: true })).toBe(jointContactCapMm3());

    const keys = runningFitPairKeys([
      { a: 'leafA', b: 'leafB', type: 'revolute' },
      { a: 'leafA', b: 'pin', type: 'fastened' },
    ]);
    const pairs = annotateRunningFits([
      { a: 'leafB', b: 'leafA', volumeMm3: 9.98, smallerPartVolumeMm3: 2400 }, // 0.1 mm knuckle overlap
      { a: 'leafA', b: 'leafB', volumeMm3: 1.13, smallerPartVolumeMm3: 2400 }, // plate graze
      { a: 'leafA', b: 'pin', volumeMm3: 9.98, smallerPartVolumeMm3: 283 }, // fastened: uniform cap
    ], keys);
    expect(classifyInterferencePairs(pairs).map((p) => p.actionable)).toEqual([true, false, false]);
  });
});
