import { describe, expect, it } from 'vitest';
import { expandCoupledPoses, type MateCouplingRecord } from './coupledPoses';
import type { MateRecord } from './mate';

const mates: MateRecord[] = [
  { name: 'grip', a: 'base.axis', b: 'driver.axis', type: 'revolute', pose: 10, limitsDeg: [0, 40] },
  { name: 'left-curl', a: 'base.axis', b: 'left.axis', type: 'revolute' },
  { name: 'right-curl', a: 'base.axis', b: 'right.axis', type: 'revolute' },
];

const couplings: MateCouplingRecord[] = [
  { driven: 'left-curl', source: 'grip', ratio: 1, offset: 0 },
  { driven: 'right-curl', source: 'grip', ratio: -1, offset: 0 },
];

describe('expandCoupledPoses', () => {
  it('derives driven scalar poses from source pose', () => {
    expect(expandCoupledPoses(mates, couplings, { grip: 20 })).toEqual({
      grip: 20,
      'left-curl': 20,
      'right-curl': -20,
    });
  });

  it('keeps explicit driven override for debugging', () => {
    expect(expandCoupledPoses(mates, couplings, { grip: 20, 'right-curl': -5 })).toEqual({
      grip: 20,
      'left-curl': 20,
      'right-curl': -5,
    });
  });

  it('uses capture-time source pose when no override is provided', () => {
    expect(expandCoupledPoses(mates, couplings, {})).toEqual({
      'left-curl': 10,
      'right-curl': -10,
    });
  });

  it('applies offsets after ratios', () => {
    expect(expandCoupledPoses(mates, [
      { driven: 'left-curl', source: 'grip', ratio: 0.5, offset: 3 },
    ], { grip: 20 })).toEqual({
      grip: 20,
      'left-curl': 13,
    });
  });
});
