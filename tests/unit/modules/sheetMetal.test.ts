import { describe, it, expect } from 'vitest';
import {
  computeBendAllowance,
  validateKFactor,
  validateBendArgs,
  validateThickness,
} from '../../../src/modeling/sheetMetal';

describe('computeBendAllowance — K-factor bend allowance', () => {
  it('90 degree, r=3, k=0.38, t=2 mm → (pi/2) * 3.76', () => {
    // BA = (pi * 90 / 180) * (0.38 * 2 + 3) = (pi/2) * 3.76
    const v = computeBendAllowance({ angleDeg: 90, radius: 3, kFactor: 0.38, thickness: 2 });
    expect(v).toBeCloseTo((Math.PI / 2) * 3.76, 9);
  });

  it('0 degree returns 0', () => {
    const v = computeBendAllowance({ angleDeg: 0, radius: 3, kFactor: 0.38, thickness: 2 });
    expect(v).toBe(0);
  });

  it('180 degree returns pi * (k*t + r)', () => {
    const v = computeBendAllowance({ angleDeg: 180, radius: 4, kFactor: 0.5, thickness: 2 });
    expect(v).toBeCloseTo(Math.PI * (0.5 * 2 + 4), 9);
  });

  it('sign-symmetric: |BA| is independent of angle sign', () => {
    const a = computeBendAllowance({ angleDeg: 90, radius: 3, kFactor: 0.38, thickness: 2 });
    const b = computeBendAllowance({ angleDeg: -90, radius: 3, kFactor: 0.38, thickness: 2 });
    expect(Math.abs(a)).toBeCloseTo(Math.abs(b), 9);
  });
});

describe('validateKFactor — bounds + finiteness', () => {
  it('accepts 0 (lower boundary)', () => {
    expect(() => validateKFactor(0)).not.toThrow();
  });
  it('accepts 1 (upper boundary)', () => {
    expect(() => validateKFactor(1)).not.toThrow();
  });
  it('accepts 0.38 (typical mild-steel value)', () => {
    expect(() => validateKFactor(0.38)).not.toThrow();
  });
  it('rejects negative', () => {
    expect(() => validateKFactor(-0.1)).toThrow(/kFactor/);
  });
  it('rejects > 1', () => {
    expect(() => validateKFactor(1.5)).toThrow(/kFactor/);
  });
  it('rejects NaN', () => {
    expect(() => validateKFactor(NaN)).toThrow(/kFactor/);
  });
  it('rejects Infinity', () => {
    expect(() => validateKFactor(Infinity)).toThrow(/kFactor/);
  });
});

describe('validateBendArgs — .bend(edgeRef, angle, radius) validation', () => {
  it('accepts (any-edge, 90, 3)', () => {
    expect(() => validateBendArgs(90, 3)).not.toThrow();
  });
  it('rejects radius <= 0', () => {
    expect(() => validateBendArgs(90, 0)).toThrow(/finite/);
    expect(() => validateBendArgs(90, -1)).toThrow(/finite/);
  });
  it('rejects non-finite angle', () => {
    expect(() => validateBendArgs(NaN, 3)).toThrow(/finite/);
    expect(() => validateBendArgs(Infinity, 3)).toThrow(/finite/);
  });
});

describe('validateThickness — sheetMetal thickness validation', () => {
  it('accepts positive thickness', () => {
    expect(() => validateThickness(2)).not.toThrow();
  });
  it('rejects zero thickness', () => {
    expect(() => validateThickness(0)).toThrow(/finite/);
  });
  it('rejects negative thickness', () => {
    expect(() => validateThickness(-1)).toThrow(/finite/);
  });
  it('rejects NaN', () => {
    expect(() => validateThickness(NaN)).toThrow(/finite/);
  });
});
