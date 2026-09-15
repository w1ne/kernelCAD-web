// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { parseDimensionText, parseScaleText, parseUnitsText } from './dimensionText';

describe('parseDimensionText', () => {
  it('reads a plain linear value', () => {
    expect(parseDimensionText('80')).toMatchObject({ kind: 'linear', value: 80, count: 1, through: false, reference: false });
  });

  it('reads decimal commas and a symmetric tolerance', () => {
    expect(parseDimensionText('12,5 ±0.1')).toMatchObject({ kind: 'linear', value: 12.5, tolerance: '±0.1' });
  });

  it('marks a parenthesised dimension as reference', () => {
    expect(parseDimensionText('(90)')).toMatchObject({ kind: 'linear', value: 90, reference: true });
  });

  it('normalises every diameter spelling', () => {
    for (const raw of ['⌀12', 'Ø12', 'ø12', '∅12', 'DIA 12']) {
      expect(parseDimensionText(raw), raw).toMatchObject({ kind: 'diameter', value: 12 });
    }
  });

  it('reads a patterned through hole in both count spellings', () => {
    expect(parseDimensionText('4× ⌀6.5 THRU')).toMatchObject({ kind: 'diameter', value: 6.5, count: 4, through: true });
    expect(parseDimensionText('4X Ø6.5 THRU')).toMatchObject({ kind: 'diameter', value: 6.5, count: 4, through: true });
    expect(parseDimensionText('⌀6.5 THRU 4 PLCS')).toMatchObject({ kind: 'diameter', value: 6.5, count: 4, through: true });
  });

  it('reads blind-hole depth in the symbol and the lettered forms', () => {
    expect(parseDimensionText('⌀6.5 ▾ 10')).toMatchObject({ depth: 10, through: false });
    expect(parseDimensionText('⌀6.5 x 10 DP')).toMatchObject({ depth: 10 });
    expect(parseDimensionText('⌀6.5 10 DEEP')).toMatchObject({ depth: 10 });
  });

  it('reads a radius and keeps a counterbore tail as extras', () => {
    expect(parseDimensionText('R5')).toMatchObject({ kind: 'radius', value: 5 });
    expect(parseDimensionText('⌀6.5 THRU ⌴⌀11 ▾ 4')).toMatchObject({ kind: 'diameter', through: true, extras: '⌴⌀11 ▾ 4' });
  });

  it('rejects labels, scales and angles', () => {
    for (const raw of ['FRONT', 'SCALE', '1:1', '45°', '1 × 45°', 'plate', '—']) {
      expect(parseDimensionText(raw), raw).toBeNull();
    }
  });
});

describe('title-block text', () => {
  it('parses scale ratios as sheet mm per model mm', () => {
    expect(parseScaleText('1:1')).toBe(1);
    expect(parseScaleText('1:2')).toBe(0.5);
    expect(parseScaleText('SCALE 2:1')).toBe(2);
    expect(parseScaleText('plate')).toBeNull();
  });

  it('parses units statements', () => {
    expect(parseUnitsText('mm')).toBe('mm');
    expect(parseUnitsText('UNITS: MM')).toBe('mm');
    expect(parseUnitsText('ALL DIMENSIONS IN INCHES')).toBe('in');
    expect(parseUnitsText('DATE')).toBeNull();
  });
});
