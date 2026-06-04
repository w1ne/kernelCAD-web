import { describe, expect, it } from 'vitest';
import { variantTemperature, reduceHarnessScore, BEST_OF_N } from './runner.js';

describe('best-of-N eval wiring', () => {
  it('exposes a fan-out width > 1', () => {
    expect(BEST_OF_N).toBeGreaterThan(1);
  });

  it('maps each variant index to a distinct temperature, undefined when not fanning out', () => {
    expect(variantTemperature(undefined)).toBeUndefined();
    const temps = [0, 1, 2, 3].map((i) => variantTemperature(i));
    expect(new Set(temps).size).toBe(4); // all distinct
    for (const t of temps) {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1);
    }
  });

  it('reduces a harness result to the mean of its scored values', () => {
    expect(reduceHarnessScore({ gates: {}, scored: { a: 0.4, b: 0.6 } })).toBeCloseTo(0.5);
  });

  it('reduces a gates-only harness result to 1 when all gates pass, 0 otherwise', () => {
    expect(reduceHarnessScore({ gates: { x: true, y: true }, scored: {} })).toBe(1);
    expect(reduceHarnessScore({ gates: { x: true, y: false }, scored: {} })).toBe(0);
  });
});
