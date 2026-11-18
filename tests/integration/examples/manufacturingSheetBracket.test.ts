// SPDX-License-Identifier: MIT
import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { flattenPatternTool } from '../../../src/agent/mcp/tools/flattenPattern';
import { dfmReviewTool } from '../../../src/agent/mcp/tools/dfmReview';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import DxfParser from 'dxf-parser';

describe('bent mounting bracket', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  it('unfolds with four mounting holes and a single bend line', async () => {
    const code = await readFile('examples/manufacturing-showcase/bent-mounting-bracket.kcad.ts', 'utf8');
    const result = await flattenPatternTool({ code });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.region?.holes).toHaveLength(4);
    expect(result.region?.bendLines).toHaveLength(1);
    const centres: string[] = [];
    for (const loop of result.region!.holes) {
      const x = loop.map(p => p[0]);
      const y = loop.map(p => p[1]);
      expect(Math.max(...x) - Math.min(...x)).toBeCloseTo(5.5, 1);
      expect(Math.max(...y) - Math.min(...y)).toBeCloseTo(5.5, 1);
      centres.push(`${Math.round((Math.max(...x) + Math.min(...x)) / 2)},${Math.round((Math.max(...y) + Math.min(...y)) / 2)}`);
    }
    expect(centres.sort()).toEqual(['20,13', '20,37', '85,13', '85,37'].sort());
  }, 120_000);

  it('exports the flat pattern as millimetre DXF with four cut loops and one bend line', async () => {
    const code = await readFile('examples/manufacturing-showcase/bent-mounting-bracket.kcad.ts', 'utf8');
    const result = await runAndExport({ code, fileName: 'bent-mounting-bracket.kcad.ts', format: 'dxf' });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(result.sheet).toEqual({ thicknessMm: 2, bendCount: 1 });

    const parsed = new DxfParser().parseSync(new TextDecoder().decode(result.bytes))!;
    expect(parsed.header?.$INSUNITS).toBe(4);
    const cut = parsed.entities.filter(entity => entity.layer === 'cut' && entity.type === 'LWPOLYLINE');
    const holes = cut.filter(entity => entity.shape && (entity.vertices?.length ?? 0) > 4);
    expect(cut).toHaveLength(5); // blank outline plus four punched holes
    expect(holes).toHaveLength(4);
    const centres = holes.map(entity => {
      const xs = entity.vertices!.map(point => point.x);
      const ys = entity.vertices!.map(point => point.y);
      expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(5.5, 1);
      expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(5.5, 1);
      return `${Math.round((Math.max(...xs) + Math.min(...xs)) / 2)},${Math.round((Math.max(...ys) + Math.min(...ys)) / 2)}`;
    });
    expect(centres.sort()).toEqual(['20,13', '20,37', '85,13', '85,37'].sort());
    const bends = parsed.entities.filter(entity => entity.layer === 'BEND');
    expect(bends).toHaveLength(1);
    expect(bends[0]).toMatchObject({ type: 'LWPOLYLINE', shape: false });
    expect(bends[0].vertices).toHaveLength(2);
  }, 120_000);

  it('passes the sheet-metal bend, hole-clearance and flange gates', async () => {
    const code = await readFile('examples/manufacturing-showcase/bent-mounting-bracket.kcad.ts', 'utf8');
    const result = await dfmReviewTool({ code, processes: ['sheet-metal'] });
    expect(result.verdict).toBe('pass');
    expect(result.checks.map(check => check.id).sort()).toEqual([
      'sheet.hole-to-bend', 'sheet.hole-to-edge', 'sheet.min-bend-radius', 'sheet.min-flange',
    ].sort());
    expect(result.checks.every(check => check.status === 'pass')).toBe(true);
  }, 120_000);

  it('uses the edited blank length when recovering the flat-pattern outline', async () => {
    const code = (await readFile('examples/manufacturing-showcase/bent-mounting-bracket.kcad.ts', 'utf8'))
      .replace("param('length', 100", "param('length', 105");
    const result = await flattenPatternTool({ code });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    const xs = result.region!.outer.map(point => point[0]);
    const ys = result.region!.outer.map(point => point[1]);
    expect(Math.min(...xs)).toBeCloseTo(0, 5);
    expect(Math.max(...xs)).toBeCloseTo(105, 5);
    expect(Math.min(...ys)).toBeCloseTo(0, 5);
    expect(Math.max(...ys)).toBeCloseTo(50, 5);
  }, 120_000);
});
