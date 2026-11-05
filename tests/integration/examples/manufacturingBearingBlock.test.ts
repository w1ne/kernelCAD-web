// SPDX-License-Identifier: MIT
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { dfmReviewTool } from '../../../src/agent/mcp/tools/dfmReview';
import { readFile } from 'node:fs/promises';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { inspectStepBuffer } from '../../../src/kernel/import/inspectStep';

describe('machined bearing block', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  it('has a through clearance bore and a shallow bearing seat plus four mounting holes', async () => {
    const result = await evaluateScriptTool({ file: 'examples/manufacturing-showcase/bearing-block.kcad.ts', skipMechanismCheck: true });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.sceneSummary?.size[0]).toBeCloseTo(80, 4);
    expect(result.sceneSummary?.size[1]).toBeCloseTo(50, 4);
    expect(result.sceneSummary?.size[2]).toBeCloseTo(18, 4);
    // Exact 7 mm counterbore depth; the boolean tool may overshoot outside
    // the top face but must not extend the floor into the finished part.
    const depth = 7;
    const expected = 80*50*18 - Math.PI * (4.25**2 * (18 - depth) + 11**2 * depth + 4 * 2.75**2 * 18);
    expect(result.sceneSummary?.volume).toBeCloseTo(expected, 1);
  }, 120_000);

  it('passes three-axis CNC access and internal-corner-radius checks', async () => {
    const result = await dfmReviewTool({
      file: 'examples/manufacturing-showcase/bearing-block.kcad.ts',
      processes: ['cnc'],
    });
    expect(result.verdict).toBe('pass');
    expect(result.checks.map(check => check.id).sort()).toEqual([
      'cnc.internal-corner-radius', 'cnc.undercuts',
    ].sort());
    expect(result.checks.every(check => check.status === 'pass')).toBe(true);
  }, 120_000);

  it('moves all four mounting holes when the block width and edge inset change', async () => {
    const code = (await readFile('examples/manufacturing-showcase/bearing-block.kcad.ts', 'utf8'))
      .replace("param('width', 50", "param('width', 60")
      .replace("param('mountInset', 10", "param('mountInset', 12");
    const exported = await runAndExport({ code, fileName: 'bearing-block.kcad.ts', format: 'step' });
    expect(exported.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const report = await inspectStepBuffer(Buffer.from(exported.bytes), 'bearing-block.kcad.ts');
    const solid = report.solids[0]!;
    const mountingHoles = solid.holes.filter(hole => Math.abs(hole.diameterMm - 5.5) < 0.05);
    expect(mountingHoles).toHaveLength(4);
    const xs = mountingHoles.map(hole => hole.axisOrigin[0]).sort((a, b) => a - b);
    const ys = mountingHoles.map(hole => hole.axisOrigin[1]).sort((a, b) => a - b);
    [12, 12, 68, 68].forEach((value, index) => expect(xs[index]).toBeCloseTo(value, 5));
    [12, 12, 48, 48].forEach((value, index) => expect(ys[index]).toBeCloseTo(value, 5));
  }, 120_000);
});
