// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { buildHandoffs, digikeyFastAddUrl, handoffItems } from '../../../../src/kernel/export/order/handoffs';
import type { BomRow } from '../../../../src/agent/script-runtime/bom';

const row = (over: Partial<BomRow>): BomRow => ({
  item: 1, name: 'x', quantity: 1, kind: 'purchased', material: null, density: null,
  massGPerUnit: null, massGTotal: null, bboxMm: { min: [0, 0, 0], max: [1, 1, 1] },
  process: null, processSource: null, instancePaths: ['x'], ...over,
});

const cat = (partNumber: string | null): NonNullable<BomRow['catalog']> =>
  ({ id: 'p', vendor: null, partNumber, source: null, license: 'MIT' });

const ROWS: BomRow[] = [
  row({ item: 1, name: 'screw_0', quantity: 4, catalog: { id: 'iso-4762-m2x4', vendor: 'kernelCAD catalog', partNumber: '91290A115', source: null, license: 'MIT' }, instancePaths: ['screw_0', 'screw_1', 'screw_2', 'screw_3'] }),
  row({ item: 2, name: 'standoff_0', quantity: 2, catalog: { id: 'standoff', vendor: null, partNumber: null, source: null, license: 'MIT' } }),
];

describe('buildHandoffs', () => {
  it('emits paste-clean vendor texts for rows with a part number', () => {
    const h = buildHandoffs(ROWS);
    expect(h.mcmaster).toBe('91290A115\n');
    expect(h.mouser).toBe('91290A115|4\n');
    expect(h.digikey).toBe('91290A115,4\n');
  });
  it('omits handoffs entirely when no purchased row has a part number', () => {
    const h = buildHandoffs([ROWS[1]]);
    expect(h.mcmaster).toBeNull();
    expect(h.mouser).toBeNull();
    expect(h.digikey).toBeNull();
  });
  it('concatenates rows in row order, exact bytes for all three vendors', () => {
    const h = buildHandoffs([
      row({ item: 1, name: 'screw_0', quantity: 4, catalog: cat('91290A115') }),
      row({ item: 2, name: 'nut_0', quantity: 10, catalog: cat('90592A006') }),
    ]);
    expect(h.mcmaster).toBe('91290A115\n90592A006\n');
    expect(h.mouser).toBe('91290A115|4\n90592A006|10\n');
    expect(h.digikey).toBe('91290A115,4\n90592A006,10\n');
  });
  it('excludes fabricated rows even when they carry a catalog part number', () => {
    const h = buildHandoffs([row({ name: 'plate', kind: 'fabricated', catalog: cat('91290A115') })]);
    expect(h.mcmaster).toBeNull();
    expect(h.mouser).toBeNull();
    expect(h.digikey).toBeNull();
  });
  it('excludes whitespace-only part numbers (trimmed before the emptiness check)', () => {
    const h = buildHandoffs([row({ catalog: cat('   ') })]);
    expect(h.mcmaster).toBeNull();
    expect(h.mouser).toBeNull();
    expect(h.digikey).toBeNull();
  });
});

describe('handoffItems', () => {
  it('keeps only purchased rows with a trimmed part number, in row order', () => {
    expect(handoffItems([
      row({ name: 'plate', kind: 'fabricated', catalog: cat('99999A001') }),
      row({ name: 'screw_0', quantity: 4, catalog: cat('  91290A115  ') }),
      row({ name: 'standoff_0', quantity: 2, catalog: cat(null) }),
      row({ name: 'nut_0', quantity: 10, catalog: cat('90592A006') }),
    ])).toEqual([
      { partNumber: '91290A115', quantity: 4 },
      { partNumber: '90592A006', quantity: 10 },
    ]);
  });
});

describe('digikeyFastAddUrl', () => {
  it('builds a FastAdd URL when every part looks like a DigiKey PN', () => {
    expect(digikeyFastAddUrl([{ partNumber: '91290A115-ND', quantity: 4 }]))
      .toBe('https://www.digikey.com/classic/ordering/fastadd.aspx?part1=91290A115-ND&qty1=4');
  });
  it('returns null when any part is not a DigiKey PN', () => {
    expect(digikeyFastAddUrl([{ partNumber: 'ISO 4762', quantity: 1 }])).toBeNull();
    expect(digikeyFastAddUrl([
      { partNumber: '91290A115-ND', quantity: 1 },
      { partNumber: 'ISO 4762', quantity: 2 },
    ])).toBeNull();
    expect(digikeyFastAddUrl([])).toBeNull();
  });
  it('numbers two items part1/qty1/part2/qty2 in order', () => {
    expect(digikeyFastAddUrl([
      { partNumber: '311-1.00KFRCT-ND', quantity: 10 },
      { partNumber: 'A26517-ND', quantity: 2 },
    ])).toBe('https://www.digikey.com/classic/ordering/fastadd.aspx?part1=311-1.00KFRCT-ND&qty1=10&part2=A26517-ND&qty2=2');
  });
});
