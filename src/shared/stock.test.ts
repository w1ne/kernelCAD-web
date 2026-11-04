// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { formatStockSpec, parseStockSpec } from './stock';

const ctx = { partName: 'shaft' };

describe('parseStockSpec', () => {
  it('accepts a round CNC bar', () => {
    expect(parseStockSpec({ kind: 'bar', lengthMm: 80, diameterMm: 20 }, ctx)).toEqual({
      kind: 'bar',
      lengthMm: 80,
      diameterMm: 20,
    });
  });

  it('accepts a rectangular bar', () => {
    expect(parseStockSpec({ kind: 'bar', lengthMm: 100, widthMm: 20, heightMm: 10 }, ctx)).toEqual({
      kind: 'bar',
      lengthMm: 100,
      widthMm: 20,
      heightMm: 10,
    });
  });

  it('accepts a plate and a blank', () => {
    expect(parseStockSpec({ kind: 'plate', lengthMm: 200, widthMm: 120, thicknessMm: 3 }, ctx)).toEqual({
      kind: 'plate',
      lengthMm: 200,
      widthMm: 120,
      thicknessMm: 3,
    });
    expect(parseStockSpec({ kind: 'blank', lengthMm: 40, widthMm: 30, heightMm: 20 }, ctx)).toEqual({
      kind: 'blank',
      lengthMm: 40,
      widthMm: 30,
      heightMm: 20,
    });
  });

  it('accepts filament diameter with an optional spool length', () => {
    expect(parseStockSpec({ kind: 'filament', diameterMm: 1.75 }, ctx)).toEqual({
      kind: 'filament',
      diameterMm: 1.75,
    });
    expect(parseStockSpec({ kind: 'filament', diameterMm: 1.75, lengthMm: 1000 }, ctx)).toEqual({
      kind: 'filament',
      diameterMm: 1.75,
      lengthMm: 1000,
    });
  });

  it('refuses a non-positive plate thickness and names the field', () => {
    expect(() => parseStockSpec(
      { kind: 'plate', lengthMm: 200, widthMm: 120, thicknessMm: 0 },
      ctx,
    )).toThrow(/opts\.stock\.thicknessMm/);
  });

  it('refuses a bar that declares neither a diameter nor a rectangular section', () => {
    expect(() => parseStockSpec({ kind: 'bar', lengthMm: 80 }, ctx)).toThrow(/diameterMm/);
  });

  it('refuses an unknown kind', () => {
    expect(() => parseStockSpec({ kind: 'tube', lengthMm: 10 }, ctx)).toThrow(/opts\.stock\.kind/);
  });

  it('refuses a non-finite blank dimension', () => {
    expect(() => parseStockSpec(
      { kind: 'blank', lengthMm: 10, widthMm: Number.NaN, heightMm: 10 },
      ctx,
    )).toThrow(/opts\.stock\.widthMm/);
  });
});

describe('formatStockSpec', () => {
  it('renders one line of millimetre dims', () => {
    expect(formatStockSpec({ kind: 'bar', lengthMm: 80, diameterMm: 20 })).toBe('bar 80xD20 mm');
    expect(formatStockSpec({ kind: 'plate', lengthMm: 200, widthMm: 120, thicknessMm: 3 })).toBe('plate 200x120x3 mm');
    expect(formatStockSpec({ kind: 'blank', lengthMm: 40, widthMm: 30, heightMm: 20 })).toBe('blank 40x30x20 mm');
    expect(formatStockSpec({ kind: 'filament', diameterMm: 1.75 })).toBe('filament D1.75 mm');
  });
});
