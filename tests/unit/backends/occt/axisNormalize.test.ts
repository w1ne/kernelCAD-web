import { describe, it, expect } from 'vitest';
import { normalizeAxis } from '../../../../src/kernel/backends/occt/occtLowerer';

describe('normalizeAxis', () => {
  it('normalizes [0, 0, 2] to [0, 0, 1]', () => {
    expect(normalizeAxis([0, 0, 2])).toEqual([0, 0, 1]);
  });

  it('normalizes [1, 1, 0] to [SQRT1_2, SQRT1_2, 0]', () => {
    const [x, y, z] = normalizeAxis([1, 1, 0]);
    expect(x).toBeCloseTo(Math.SQRT1_2);
    expect(y).toBeCloseTo(Math.SQRT1_2);
    expect(z).toBe(0);
  });

  it('throws feature.invalid-args on [0, 0, 0]', () => {
    expect(() => normalizeAxis([0, 0, 0])).toThrow(/non-zero|axis\.zero/);
  });

  it('throws on NaN coords', () => {
    expect(() => normalizeAxis([NaN, 0, 0])).toThrow();
  });

  it('throws on Infinity coords', () => {
    expect(() => normalizeAxis([Infinity, 0, 0])).toThrow();
  });
});
