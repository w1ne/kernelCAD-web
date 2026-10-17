// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { buildHandoffs, digikeyFastAddUrl } from '../../../../src/kernel/export/order/handoffs';
import type { BomRow } from '../../../../src/agent/script-runtime/bom';

const row = (over: Partial<BomRow>): BomRow => ({
  item: 1, name: 'x', quantity: 1, kind: 'purchased', material: null, density: null,
  massGPerUnit: null, massGTotal: null, bboxMm: { min: [0, 0, 0], max: [1, 1, 1] },
  process: null, processSource: null, instancePaths: ['x'], ...over,
});

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
});

describe('digikeyFastAddUrl', () => {
  it('builds a FastAdd URL when every part looks like a DigiKey PN', () => {
    expect(digikeyFastAddUrl([{ partNumber: '91290A115-ND', quantity: 4 }]))
      .toBe('https://www.digikey.com/classic/ordering/fastadd.aspx?part1=91290A115-ND&qty1=4');
  });
  it('returns null when any part is not a DigiKey PN', () => {
    expect(digikeyFastAddUrl([{ partNumber: 'ISO 4762', quantity: 1 }])).toBeNull();
    expect(digikeyFastAddUrl([])).toBeNull();
  });
});
