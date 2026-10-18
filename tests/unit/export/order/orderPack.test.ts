// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { buildOrderPack, zipOrderPack, partFolderName } from '../../../../src/kernel/export/order/orderPack';
import type { OrderPackBomRow } from '../../../../src/kernel/export/order/orderRows';

const plate: OrderPackBomRow = { item: 1, name: 'Plate, Left', quantity: 2, kind: 'fabricated', material: 'steel', density: 7850, massGPerUnit: 10, massGTotal: 20, bboxMm: { min: [0, 0, 0], max: [1, 1, 1] }, process: 'sheet-cut', processSource: 'declared', instancePaths: ['plate_a', 'plate_b'] };
const screw: OrderPackBomRow = { item: 2, name: 'screw_0', quantity: 4, kind: 'purchased', material: null, density: null, massGPerUnit: null, massGTotal: null, bboxMm: { min: [0, 0, 0], max: [1, 1, 1] }, process: null, processSource: null, catalog: { id: 'iso-4762-m2x4', vendor: 'kernelCAD catalog', partNumber: '91290A115', source: null, license: 'MIT' }, instancePaths: ['screw_0', 'screw_1', 'screw_2', 'screw_3'] };

describe('orderPack', () => {
  it('slugs part folders from item + name', () => {
    expect(partFolderName(plate)).toBe('1-plate-left');
  });
  it('trims slug edges and falls back to "part" when the name has no slug characters', () => {
    expect(partFolderName({ ...plate, item: 7, name: '  ???  ' })).toBe('7-part');
    expect(partFolderName({ ...plate, item: 8, name: '--Plate/Left--' })).toBe('8-plate-left');
  });
  it('lays out parts, handoffs, manifest and a bom csv in the zip', () => {
    const csv = 'item,name,quantity\n1,Plate,2\n';
    const pack = buildOrderPack({
      name: 'demo',
      rows: [plate, screw],
      totals: { partCount: 6, uniquePartCount: 2, totalMassG: 20 },
      csv,
      files: [
        { row: plate, kind: 'step', bytes: new Uint8Array([1]) },
        { row: plate, kind: 'stl', bytes: new Uint8Array([4]) },
        { row: plate, kind: 'dxf', bytes: new Uint8Array([2]) },
        { row: plate, kind: 'drawing', bytes: new Uint8Array([3]) },
      ],
    });
    const zip = unzipSync(zipOrderPack(pack));
    const names = Object.keys(zip).sort();
    expect(names).toEqual([
      'README.txt', 'bom.csv', 'bom.json',
      'handoffs/digikey.txt', 'handoffs/mcmaster.txt', 'handoffs/mouser.txt',
      'manifest.json',
      'parts/1-plate-left/drawing.pdf', 'parts/1-plate-left/model.dxf',
      'parts/1-plate-left/model.step', 'parts/1-plate-left/model.stl',
    ]);
    expect(Array.from(zip['parts/1-plate-left/model.step'])).toEqual([1]);
    expect(Array.from(zip['parts/1-plate-left/model.stl'])).toEqual([4]);
    expect(strFromU8(zip['bom.csv'])).toBe(csv);
    const manifest = JSON.parse(strFromU8(zip['manifest.json']));
    expect(manifest.parts[0]).toMatchObject({ folder: '1-plate-left', qty: 2, kind: 'fabricated', process: 'sheet-cut' });
    expect(manifest.parts[0].files).toEqual([
      'parts/1-plate-left/model.step', 'parts/1-plate-left/model.stl',
      'parts/1-plate-left/model.dxf', 'parts/1-plate-left/drawing.pdf',
    ]);
    expect(manifest.parts[1]).toMatchObject({ folder: '2-screw-0', qty: 4, kind: 'purchased', process: null, material: null, massG: null, files: [] });
    expect(manifest.handoffCaveats.mcmaster).toContain('packs');
    expect(manifest.notes).toEqual([]);
    expect(strFromU8(zip['handoffs/mcmaster.txt'])).toBe('91290A115\n');
    expect(strFromU8(zip['handoffs/mouser.txt'])).toBe('91290A115|4\n');
    expect(strFromU8(zip['handoffs/digikey.txt'])).toBe('91290A115,4\n');
    const bom = JSON.parse(strFromU8(zip['bom.json']));
    expect(bom.rows).toHaveLength(2);
    expect(bom.totals).toEqual({ partCount: 6, uniquePartCount: 2, totalMassG: 20 });
  });
  it('writes null totals when the caller does not provide them', () => {
    const pack = buildOrderPack({ name: 'demo', rows: [plate], csv: 'x\n', files: [] });
    const zip = unzipSync(zipOrderPack(pack));
    const bom = JSON.parse(strFromU8(zip['bom.json']));
    expect(bom.rows).toHaveLength(1);
    expect(bom.totals).toBeNull();
  });
  it('records caller notes in the manifest and README', () => {
    const pack = buildOrderPack({ name: 'demo', rows: [plate], csv: 'x\n', files: [], notes: ['part plate: sheet-cut but no flat geometry — STEP only'] });
    const zip = unzipSync(zipOrderPack(pack));
    const manifest = JSON.parse(strFromU8(zip['manifest.json']));
    expect(manifest.notes).toEqual(['part plate: sheet-cut but no flat geometry — STEP only']);
    expect(strFromU8(zip['README.txt'])).toContain('sheet-cut but no flat geometry');
  });
  it('throws on a duplicate entry path for one row and kind', () => {
    expect(() => buildOrderPack({
      name: 'demo', rows: [plate], csv: 'x\n',
      files: [
        { row: plate, kind: 'step', bytes: new Uint8Array([1]) },
        { row: plate, kind: 'step', bytes: new Uint8Array([2]) },
      ],
    })).toThrow(/duplicate entry path parts\/1-plate-left\/model\.step \(row "Plate, Left"/);
  });
  it('throws when a file row is not one of the BOM rows', () => {
    expect(() => buildOrderPack({
      name: 'demo', rows: [plate], csv: 'x\n',
      files: [{ row: screw, kind: 'step', bytes: new Uint8Array([1]) }],
    })).toThrow(/unknown row "screw_0" \(item 2\)/);
  });
});
