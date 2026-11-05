// SPDX-License-Identifier: MIT
import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { dfmReviewTool } from '../../../src/agent/mcp/tools/dfmReview';
import { flattenPatternTool } from '../../../src/agent/mcp/tools/flattenPattern';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const source = (name: string) => readFile(`examples/manufacturing-showcase/${name}.kcad.ts`, 'utf8');
const setDefaults = (code: string, updates: Array<[string, string]>): string =>
  updates.reduce((result, [before, after]) => {
    const next = result.replace(before, after);
    if (next === result) throw new Error(`Could not find model default ${before}`);
    return next;
  }, code);

describe('manufacturing showcase parameter variants', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('moves the bearing-block mount pattern with its length at the long, thick limit', async () => {
    const code = setDefaults(await source('bearing-block'), [
      ["param('length', 80", "param('length', 120"],
      ["param('width', 50", "param('width', 45"],
      ["param('thickness', 18", "param('thickness', 30"],
      ["param('seatDiameter', 22", "param('seatDiameter', 22.2"],
      ["param('mountInset', 10", "param('mountInset', 14"],
    ]);
    const result = await evaluateScriptTool({ code, skipMechanismCheck: true });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.sceneSummary?.size).toEqual([120, 45, 30]);
    const expectedVolume = 120 * 45 * 30 - Math.PI * (4.25 ** 2 * 23 + 11.1 ** 2 * 7 + 4 * 2.75 ** 2 * 30);
    expect(result.sceneSummary?.volume).toBeCloseTo(expectedVolume, 1);
  }, 120_000);

  it('flattens a wide, steep bracket with the selected hole diameter', async () => {
    const code = setDefaults(await source('bent-mounting-bracket'), [
      ["param('bendAngle', 90", "param('bendAngle', 120"],
      ["param('length', 100", "param('length', 115"],
      ["param('width', 50", "param('width', 100"],
      ["param('holeDiameter', 5.5", "param('holeDiameter', 6.6"],
    ]);
    const result = await flattenPatternTool({ code });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.region?.bendLines).toHaveLength(1);
    expect(result.region?.bendLines[0].angle).toBeCloseTo(120, 6);
    expect(result.region?.holes).toHaveLength(4);
    const centresX: number[] = [];
    const centresY: number[] = [];
    for (const loop of result.region!.holes) {
      const x = loop.map(point => point[0]);
      const y = loop.map(point => point[1]);
      expect(Math.max(...x) - Math.min(...x)).toBeCloseTo(6.6, 1);
      expect(Math.max(...y) - Math.min(...y)).toBeCloseTo(6.6, 1);
      centresX.push((Math.max(...x) + Math.min(...x)) / 2);
      centresY.push((Math.max(...y) + Math.min(...y)) / 2);
    }
    expect(centresX.sort((a, b) => a - b)).toEqual([20, 20, 100, 100]);
    expect(centresY.sort((a, b) => a - b)).toEqual([13, 13, 87, 87]);
    const dfm = await dfmReviewTool({ code, processes: ['sheet-metal'] });
    expect(dfm.verdict, JSON.stringify(dfm.checks)).toBe('pass');
    expect(dfm.checks.every(check => check.status === 'pass')).toBe(true);
  }, 120_000);

  it('changes the motor-plate envelope while keeping its motor pattern inside the stock', async () => {
    const code = setDefaults(await source('cut-motor-plate'), [
      ["param('length', 100", "param('length', 130"],
      ["param('width', 80", "param('width', 110"],
      ["param('thickness', 4", "param('thickness', 6"],
      ["param('motorPitch', 31", "param('motorPitch', 40"],
      ["param('pilotDiameter', 22", "param('pilotDiameter', 26"],
      ["param('mountDiameter', 5.5", "param('mountDiameter', 8"],
    ]);
    const result = await evaluateScriptTool({ code, skipMechanismCheck: true });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.sceneSummary?.size).toEqual([130, 110, 6]);
    const expectedVolume = 130 * 110 * 6 - Math.PI * (4 * 4 ** 2 * 6 + 4 * 1.7 ** 2 * 6 + 13 ** 2 * 6);
    expect(result.sceneSummary?.volume).toBeCloseTo(expectedVolume, 1);
    expect(result.sceneSummary?.valid).toBe(true);
  }, 120_000);

  it('keeps the turned spacer open and valid at the longest, largest-bore limit', async () => {
    const code = setDefaults(await source('shoulder-spacer'), [
      ["param('length', 25", "param('length', 60"],
      ["param('bodyDiameter', 20", "param('bodyDiameter', 26"],
      ["param('flangeDiameter', 30", "param('flangeDiameter', 40"],
      ["param('boreDiameter', 8.5", "param('boreDiameter', 12"],
      ["param('flangeThickness', 3", "param('flangeThickness', 5"],
    ]);
    const result = await evaluateScriptTool({ code, skipMechanismCheck: true });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.sceneSummary?.size).toEqual([40, 40, 60]);
    const expectedVolume = Math.PI * (20 ** 2 * 5 + 13 ** 2 * 55 - 6 ** 2 * 60);
    expect(result.sceneSummary?.volume).toBeCloseTo(expectedVolume, 1);
  }, 120_000);

  it('grows the shaft and shoulder without invalidating the bearing assembly', async () => {
    const code = setDefaults(await source('bearing-shaft-assembly'), [
      ["param('shaftLength', 30", "param('shaftLength', 50"],
      ["param('shaftDiameter', 7.9", "param('shaftDiameter', 7.95"],
      ["param('shoulderDiameter', 12", "param('shoulderDiameter', 14"],
      ["param('retainerThickness', 2", "param('retainerThickness', 3"],
    ]);
    const result = await evaluateScriptTool({ code, skipMechanismCheck: true });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.parts?.count).toBe(4);
    expect(result.sceneSummary?.size[2]).toBeCloseTo(50, 3);
    const review = await reviewCadTool({ code, includeInterference: true, includePoseEnvelope: true });
    expect(review.ok, JSON.stringify(review.diagnostics)).toBe(true);
    if (review.ok) expect(review.rawInterferencePairs).toEqual([]);
  }, 120_000);
});
