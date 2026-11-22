// SPDX-License-Identifier: MIT
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { readFile } from 'node:fs/promises';
import DxfParser from 'dxf-parser';
import { runAndExport } from '../../../src/agent/script-runtime/export';

describe('laser-cut motor mounting plate', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  it('builds finite geometry with the specified outer dimensions', async () => {
    const result = await evaluateScriptTool({ file: 'examples/manufacturing-showcase/cut-motor-plate.kcad.ts', skipMechanismCheck: true });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.sceneSummary?.valid).toBe(true);
    expect(result.sceneSummary?.size[0]).toBeCloseTo(100, 3);
    expect(result.sceneSummary?.size[1]).toBeCloseTo(80, 3);
    expect(result.sceneSummary?.size[2]).toBeCloseTo(4, 3);
    // Four M5 clearance holes, four M3 clearance holes, and the 22 mm
    // motor pilot are all through cuts. This checks their aggregate area,
    // rather than merely checking that a bounding box was returned.
    const expectedVolume = 4 * (100 * 80 - Math.PI * (4 * 2.75 ** 2 + 4 * 1.7 ** 2 + 11 ** 2));
    expect(result.sceneSummary?.volume).toBeCloseTo(expectedVolume, 1);
  }, 120_000);
  it('exports one closed outline and nine exact circular cut loops in millimetres', async () => {
    const code = await readFile('examples/manufacturing-showcase/cut-motor-plate.kcad.ts', 'utf8');
    const result = await runAndExport({ code, fileName: 'cut-motor-plate.kcad.ts', format: 'dxf' });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const parsed = new DxfParser().parseSync(new TextDecoder().decode(result.bytes))!;
    expect(parsed.header?.$INSUNITS).toBe(4);
    expect(parsed.entities).toHaveLength(10);
    expect(parsed.entities.every(entity => entity.type === 'LWPOLYLINE' && entity.shape)).toBe(true);
    const circles = parsed.entities.filter(entity => entity.vertices?.length === 2);
    expect(circles).toHaveLength(9);
    const diameters = circles.map(entity => {
      const [a, b] = entity.vertices!;
      expect(Math.abs(a.bulge ?? 0)).toBeCloseTo(1);
      expect(Math.abs(b.bulge ?? 0)).toBeCloseTo(1);
      return Math.hypot(a.x - b.x, a.y - b.y);
    }).sort((a, b) => a - b);
    [3.4, 3.4, 3.4, 3.4, 5.5, 5.5, 5.5, 5.5, 22].forEach((expected, i) => {
      expect(diameters[i]).toBeCloseTo(expected, 5);
    });
    const centres = circles.map(entity => {
      const [a, b] = entity.vertices!;
      return `${((a.x + b.x) / 2).toFixed(1)},${((a.y + b.y) / 2).toFixed(1)}`;
    }).sort();
    expect(centres).toEqual(['10.0,10.0', '10.0,70.0', '34.5,24.5', '34.5,55.5',
      '50.0,40.0', '65.5,24.5', '65.5,55.5', '90.0,10.0', '90.0,70.0'].sort());
  }, 120_000);
  it('rebuilds at a different sheet thickness without moving the mounting pattern', async () => {
    const code = (await readFile('examples/manufacturing-showcase/cut-motor-plate.kcad.ts', 'utf8'))
      .replace("param('thickness', 4", "param('thickness', 6");
    const result = await evaluateScriptTool({ code, skipMechanismCheck: true });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.sceneSummary?.size[2]).toBeCloseTo(6, 4);
    const area = 100 * 80 - Math.PI * (4 * 2.75 ** 2 + 4 * 1.7 ** 2 + 11 ** 2);
    expect(result.sceneSummary?.volume).toBeCloseTo(area * 6, 1);
  }, 120_000);

  it('moves frame holes with the plate edges and applies the edited motor interface dimensions', async () => {
    const code = (await readFile('examples/manufacturing-showcase/cut-motor-plate.kcad.ts', 'utf8'))
      .replace("param('length', 100", "param('length', 130")
      .replace("param('width', 80", "param('width', 110")
      .replace("param('motorPitch', 31", "param('motorPitch', 40")
      .replace("param('pilotDiameter', 22", "param('pilotDiameter', 26")
      .replace("param('mountDiameter', 5.5", "param('mountDiameter', 8");
    const result = await runAndExport({ code, fileName: 'cut-motor-plate.kcad.ts', format: 'dxf' });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const parsed = new DxfParser().parseSync(new TextDecoder().decode(result.bytes))!;
    expect(parsed.header?.$INSUNITS).toBe(4);
    const circles = parsed.entities.filter(entity => entity.vertices?.length === 2);
    const rows = circles.map(entity => {
      const [a, b] = entity.vertices!;
      return {
        diameter: Math.hypot(a.x - b.x, a.y - b.y),
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
      };
    });
    const frame = rows.filter(row => Math.abs(row.diameter - 8) < 0.01);
    expect(frame).toHaveLength(4);
    expect(frame.map(row => `${row.x.toFixed(1)},${row.y.toFixed(1)}`).sort())
      .toEqual(['10.0,10.0', '10.0,100.0', '120.0,10.0', '120.0,100.0']);
    const motor = rows.filter(row => Math.abs(row.diameter - 3.4) < 0.01);
    expect(motor.map(row => `${row.x.toFixed(1)},${row.y.toFixed(1)}`).sort())
      .toEqual(['45.0,35.0', '45.0,75.0', '85.0,35.0', '85.0,75.0']);
    const pilot = rows.find(row => Math.abs(row.diameter - 26) < 0.01);
    expect(pilot?.x).toBeCloseTo(65, 5);
    expect(pilot?.y).toBeCloseTo(55, 5);
  }, 120_000);
});
