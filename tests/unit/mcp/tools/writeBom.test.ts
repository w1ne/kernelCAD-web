// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { bomRowsToCsv, bomRowsToSheetsRows, mergeBomRows, writeBomTool, type BomHandoff } from '../../../../src/agent/mcp/tools/writeBom';
import drawbotHandoff from '../../../fixtures/argon/handoff-drawbot.json';

const handoff = drawbotHandoff as BomHandoff;

describe('write_bom', () => {
  it('merges handoff rows with KernelCAD price and MPN data and produces escaped CSV', () => {
    const rows = mergeBomRows(handoff, [
      { ref: 'M1', partNumber: '17HS4401', vendor: 'Example', price: 4.25, currency: 'USD' },
      { id: 'M3-INSERT', name: 'M3 heat-set insert', partNumber: 'HS-M3', vendor: 'Catalog', price: 0.12 },
    ]);
    expect(rows).toHaveLength(8);
    expect(rows.find(row => row.ref === 'M1')).toMatchObject({ mpn: '17HS4401', unit_price: 4.25, source: expect.stringContaining('KernelCAD:Example') });
    expect(rows.at(-1)).toMatchObject({ ref: '', part: 'M3 heat-set insert', mpn: 'HS-M3', unit_price: 0.12 });
    expect(bomRowsToCsv([{ ...rows[0]!, part: 'ESP32, "DevKit"' }])).toContain('"ESP32, ""DevKit"""');
  });

  it('retains handoff MPN provenance in notes with and without catalog matches', () => {
    const provenanceHandoff: BomHandoff = { parts: [
      { ref: 'R1', part: 'resistor', mpn: { value: 'R-100', source: 'estimated from schematic' } },
      { ref: 'R2', part: 'resistor', mpn: { value: 'R-200', source: 'estimated from schematic' } },
    ] };
    const rows = mergeBomRows(provenanceHandoff, [{ ref: 'R2', vendor: 'Catalog', partNumber: 'CAT-200' }]);
    expect(rows[0]?.notes).toContain('estimated from schematic');
    expect(rows[1]?.notes).toContain('estimated from schematic');
    expect(rows[1]?.source).toContain('KernelCAD:Catalog');
  });

  it('retains unmatched ref-bearing catalog additions while excluding matched entries', () => {
    const rows = mergeBomRows(handoff, [
      { ref: 'M1', partNumber: 'matched', vendor: 'Catalog', price: 1 },
      { ref: 'R1', name: '1 kΩ resistor', partNumber: 'R-1K', qty: 2, price: 0.03 },
    ]);
    expect(rows.find(row => row.ref === 'M1')).toMatchObject({ unit_price: 1 });
    expect(rows).toContainEqual(expect.objectContaining({ ref: 'R1', qty: 2, part: '1 kΩ resistor', mpn: 'R-1K', unit_price: 0.03 }));
  });

  it('adds matched catalog quantity to the handoff quantity', () => {
    const source = { parts: [{ ref: 'R1', quantity: 3, catalog_id: 'res-1' }] } as BomHandoff;
    const rows = mergeBomRows(source, [{ id: 'res-1', ref: 'R1', qty: 8 }]);
    expect(rows[0]?.qty).toBe(11);
    expect(mergeBomRows({ parts: [{ ref: 'R2', quantity: 3 }] }, [{ ref: 'R2' }])[0]?.qty).toBe(3);
  });

  it('keeps secondary matches as catalog rows when multiple entries match one handoff part', () => {
    const source: BomHandoff = { parts: [{ ref: 'R1', catalog_id: 'catalog-1', quantity: 2 }] };
    const rows = mergeBomRows(source, [
      { ref: 'R1', id: 'catalog-1', name: 'Primary resistor', qty: 3, price: 0.1 },
      { id: 'catalog-1', name: 'Secondary catalog listing', qty: 4, price: 0.2, vendor: 'Alternate' },
    ]);

    expect(rows[0]).toMatchObject({ ref: 'R1', qty: 5, part: 'Primary resistor', unit_price: 0.1 });
    expect(rows).toContainEqual(expect.objectContaining({
      ref: '', part: 'Secondary catalog listing', qty: 4, unit_price: 0.2, source: 'KernelCAD:Alternate',
    }));
  });

  it('neutralizes formula prefixes in CSV and Sheets-ready text cells', () => {
    const unsafe = ['=1+1', '+SUM(A1:A2)', '-1+2', '@SUM(A1:A2)', '\t=1+1', '\r=1+1', ' =1+1', '  +SUM(A1:A2)', '\t  @SUM(A1:A2)'];
    for (const value of unsafe) {
      const row = { ref: value, qty: 1, part: value, mpn: '', source: '', unit_price: '' as const, notes: '' };
      expect(bomRowsToSheetsRows([row])[0]?.[0]).toBe(`'${value}`);
      expect(bomRowsToSheetsRows([row])[0]?.[2]).toBe(`'${value}`);
      const csvRow = bomRowsToCsv([row]).split('\r\n')[1] ?? '';
      expect(csvRow.startsWith(`'${value}`) || csvRow.startsWith(`"'${value.replaceAll('"', '""')}"`)).toBe(true);
    }
    expect(bomRowsToCsv([{ ref: 'safe', qty: 1, part: 'ordinary', mpn: '', source: '', unit_price: '', notes: '' }]))
      .toContain('safe,1,ordinary');
  });

  it('writes CSV when Sheets is not configured and returns its contents and path', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'kc-bom-'));
    try {
      const outputPath = path.join(dir, 'bom.csv');
      const result = await writeBomTool({ handoff, output_path: outputPath });
      expect(result).toMatchObject({ ok: true, destination: 'csv', path: outputPath });
      expect(await readFile(outputPath, 'utf8')).toBe(result.csv);
      expect(result.csv.split('\r\n')[0]).toBe('ref,qty,part,MPN,source,unit price,notes');
      expect(result.headers).toEqual(['ref', 'qty', 'part', 'MPN', 'source', 'unit price', 'notes']);
      expect(result.sheets_rows[0]).toEqual(result.headers);
      expect(result.sheets_rows).toHaveLength(handoff.parts.length + 1);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it('rejects an absolute output path outside the allowed area before writing', async () => {
    const outputPath = path.join(path.parse(process.cwd()).root, 'etc', 'kernelcad-bom-unsafe.csv');
    const result = await writeBomTool({ handoff, output_path: outputPath, overwrite: true });
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/Refusing|not allowed|protected/i) });
  });

  it('preserves an existing output file unless overwrite is explicitly enabled', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'kc-bom-exclusive-'));
    try {
      const outputPath = path.join(dir, 'existing.csv');
      await writeFile(outputPath, 'keep me');
      const refused = await writeBomTool({ handoff, output_path: outputPath });
      expect(refused).toMatchObject({ ok: false, error: expect.stringMatching(/exist|EEXIST/i) });
      expect(await readFile(outputPath, 'utf8')).toBe('keep me');

      const replaced = await writeBomTool({ handoff, output_path: outputPath, overwrite: true });
      expect(replaced).toMatchObject({ ok: true, path: outputPath });
      expect(await readFile(outputPath, 'utf8')).toBe(replaced.csv);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it('refuses to overwrite through a symlink destination', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'kc-bom-symlink-'));
    try {
      const targetPath = path.join(dir, 'important.txt');
      const outputPath = path.join(dir, 'bom.csv');
      await writeFile(targetPath, 'preserve target');
      await symlink(targetPath, outputPath);
      const result = await writeBomTool({ handoff, output_path: outputPath, overwrite: true });
      expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/symlink|Refusing|not a regular file/i) });
      expect(await readFile(targetPath, 'utf8')).toBe('preserve target');
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it('requires exactly one handoff input form', async () => {
    const result = await writeBomTool({ handoff, handoff_json: JSON.stringify(handoff) });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('exactly one') });
  });

  it('rejects malformed handoff parts and invalid catalog quantities or prices', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'kc-bom-invalid-'));
    try {
      const output_path = path.join(dir, 'bom.csv');
      const missingRef = await writeBomTool({ handoff: { parts: [{ ref: '' }] }, output_path });
      expect(missingRef).toMatchObject({ ok: false, error: expect.stringContaining('.ref') });

      const badQty = await writeBomTool({ handoff: { parts: [{ ref: 'R1', qty: Infinity }] }, output_path });
      expect(badQty).toMatchObject({ ok: false, error: expect.stringContaining('positive safe integer') });

      const badPrice = await writeBomTool({ handoff, catalog_parts: [{ ref: 'R1', price: -1 }] , output_path });
      expect(badPrice).toMatchObject({ ok: false, error: expect.stringContaining('non-negative finite number') });
    } finally { await rm(dir, { recursive: true, force: true }); }
  });


  it('keeps a secondary catalog match as its own row when two entries match one handoff part', () => {
    const rows = mergeBomRows(
      { parts: [{ ref: 'U1', catalog_id: 'esp32', quantity: 1 }] },
      [
        { ref: 'U1', partNumber: 'by-ref', vendor: 'A', price: 1 },
        { id: 'esp32', partNumber: 'by-id', vendor: 'B', price: 2 },
      ],
    );
    expect(rows.some(row => row.mpn === 'by-ref')).toBe(true);
    expect(rows.some(row => row.mpn === 'by-id')).toBe(true);
  });

});
