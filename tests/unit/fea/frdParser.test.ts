// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Unit tests for the CalculiX .frd / .dat parsers.
//
// The .frd value line is FIXED-WIDTH, not whitespace-separated: CalculiX
// writes `1.49381E-02-9.54959E-06` with no gap when a value is negative.
// Splitting on whitespace silently merges two components into one garbage
// number, so the fixture below deliberately contains that exact packing.

import { describe, it, expect } from 'vitest';
import { parseFrd, vonMisesFromTensor } from '../../../src/kernel/fea/frdParser';
import { parseDat } from '../../../src/kernel/fea/datParser';

const FRD = [
  '    1C',
  '    2C                             3                                     1',
  ' -1         1 0.00000E+00 0.00000E+00 0.00000E+00',
  ' -1         2 1.00000E+02 0.00000E+00 0.00000E+00',
  ' -1         7 1.00000E+02 1.00000E+01 1.00000E+01',
  ' -3',
  '    3C                             1                                     1',
  ' -1         1    4    1    1',
  ' -2         1    2    3    4    5    6    7    8    9   10',
  ' -3',
  '  100CL  101',
  ' -4  DISP        4    1',
  ' -5  D1          1    2    1    0',
  ' -5  D2          1    2    2    0',
  ' -5  D3          1    2    3    0',
  ' -5  ALL         1    2    0    0    1ALL',
  ' -1         1 0.00000E+00 0.00000E+00 0.00000E+00',
  ' -1         2 1.49381E-02-9.54959E-06-1.99954E-01',
  ' -1         7 1.00000E-02 2.00000E-02 3.00000E-02',
  ' -3',
  ' -4  STRESS      6    1',
  ' -5  SXX         1    4    1    1',
  ' -5  SYY         1    4    2    2',
  ' -5  SZZ         1    4    3    3',
  ' -5  SXY         1    4    1    2',
  ' -5  SYZ         1    4    2    3',
  ' -5  SZX         1    4    3    1',
  ' -1         1 6.00000E+01 0.00000E+00 0.00000E+00 0.00000E+00 0.00000E+00 0.00000E+00',
  ' -1         2-1.00000E+01 0.00000E+00 0.00000E+00 0.00000E+00 0.00000E+00 0.00000E+00',
  ' -1         7 0.00000E+00 0.00000E+00 0.00000E+00 1.00000E+01 0.00000E+00 0.00000E+00',
  ' -3',
  ' -4  ERROR       1    1',
  ' -5  STR(%)      1    1    0    0',
  ' -1         1 3.75576E+01',
  ' -1         2 1.00000E+00',
  ' -1         7 2.00000E+00',
  ' -3',
  ' 9999',
].join('\n');

describe('vonMisesFromTensor', () => {
  it('returns |sigma| for uniaxial tension', () => {
    expect(vonMisesFromTensor([60, 0, 0, 0, 0, 0])).toBeCloseTo(60, 9);
  });
  it('returns sqrt(3)*tau for pure shear', () => {
    expect(vonMisesFromTensor([0, 0, 0, 10, 0, 0])).toBeCloseTo(Math.sqrt(3) * 10, 9);
  });
  it('returns 0 for hydrostatic stress', () => {
    expect(vonMisesFromTensor([50, 50, 50, 0, 0, 0])).toBeCloseTo(0, 9);
  });
});

describe('parseFrd', () => {
  it('reads fixed-width columns so a packed negative value is not merged', () => {
    const r = parseFrd(FRD);
    const i = r.nodeIds.indexOf(2);
    expect(r.displacement[i][0]).toBeCloseTo(0.0149381, 9);
    expect(r.displacement[i][1]).toBeCloseTo(-9.54959e-6, 12);
    expect(r.displacement[i][2]).toBeCloseTo(-0.199954, 9);
  });

  it('keeps the solver node ids rather than renumbering', () => {
    expect(parseFrd(FRD).nodeIds).toEqual([1, 2, 7]);
  });

  it('derives von Mises per node from the six stress components', () => {
    const r = parseFrd(FRD);
    expect(r.vonMises[0]).toBeCloseTo(60, 6);
    expect(r.vonMises[1]).toBeCloseTo(10, 6);
    expect(r.vonMises[2]).toBeCloseTo(Math.sqrt(3) * 10, 6);
  });

  it("carries CalculiX's own nodal stress-error estimate", () => {
    expect(parseFrd(FRD).stressErrorPercent[0]).toBeCloseTo(37.5576, 4);
  });

  it('throws when the deck produced no displacement block (a failed solve)', () => {
    expect(() => parseFrd('    1C\n 9999\n')).toThrow(/DISP/);
  });
});

describe('parseDat', () => {
  it('reads the total reaction force on the fixed set', () => {
    const dat = [
      '                        S T E P       1',
      '',
      '                                INCREMENT     1',
      '',
      ' total force (fx,fy,fz) for set NFIXED and time  0.1000000E+01',
      '',
      '        4.507328E-10  3.224230E-10  1.000000E+02',
      '',
    ].join('\n');
    const r = parseDat(dat);
    expect(r.totalReactionForce).toBeDefined();
    expect(r.totalReactionForce![2]).toBeCloseTo(100, 6);
  });

  it('returns no totals when the .dat carries none', () => {
    expect(parseDat('').totalReactionForce).toBeUndefined();
  });
});
