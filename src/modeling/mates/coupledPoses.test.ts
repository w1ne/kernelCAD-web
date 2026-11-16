// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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

  it('resolves a chained coupling that is declared before its source coupling', () => {
    // A gear train input -> idler -> output, with the output coupling written
    // first. The output must follow the idler's derived pose, not the idler's
    // stale authored pose.
    const train: MateRecord[] = [
      { name: 'input', a: 'base.a', b: 'g1.axis', type: 'revolute', pose: 0 },
      { name: 'idler', a: 'base.b', b: 'g2.axis', type: 'revolute', pose: 0 },
      { name: 'output', a: 'base.c', b: 'g3.axis', type: 'revolute', pose: 0 },
    ];
    const chain: MateCouplingRecord[] = [
      { driven: 'output', source: 'idler', ratio: -0.5 },
      { driven: 'idler', source: 'input', ratio: -2 },
    ];
    expect(expandCoupledPoses(train, chain, { input: 30 })).toEqual({
      input: 30,
      idler: -60,
      output: 30,
    });
  });

  it('keeps an explicit override of a middle chain mate as the source of the next link', () => {
    const train: MateRecord[] = [
      { name: 'input', a: 'base.a', b: 'g1.axis', type: 'revolute', pose: 0 },
      { name: 'idler', a: 'base.b', b: 'g2.axis', type: 'revolute', pose: 0 },
      { name: 'output', a: 'base.c', b: 'g3.axis', type: 'revolute', pose: 0 },
    ];
    const chain: MateCouplingRecord[] = [
      { driven: 'output', source: 'idler', ratio: -0.5 },
      { driven: 'idler', source: 'input', ratio: -2 },
    ];
    expect(expandCoupledPoses(train, chain, { input: 30, idler: 10 })).toEqual({
      input: 30,
      idler: 10,
      output: -5,
    });
  });

  it('terminates on a coupling cycle', () => {
    const loop: MateRecord[] = [
      { name: 'a', a: 'base.a', b: 'p.a', type: 'revolute', pose: 4 },
      { name: 'b', a: 'base.b', b: 'q.b', type: 'revolute', pose: 6 },
    ];
    const expanded = expandCoupledPoses(loop, [
      { driven: 'a', source: 'b', ratio: 1 },
      { driven: 'b', source: 'a', ratio: 1 },
    ], {});
    expect(Number.isFinite(expanded.a)).toBe(true);
    expect(Number.isFinite(expanded.b)).toBe(true);
  });
});
