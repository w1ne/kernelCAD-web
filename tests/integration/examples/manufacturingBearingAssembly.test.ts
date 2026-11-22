// SPDX-License-Identifier: MIT
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';
import { readFile } from 'node:fs/promises';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { inspectStepBuffer } from '../../../src/kernel/import/inspectStep';

describe('mounted bearing and shaft', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  it('builds the housing, bearing, retainer and shaft as separate parts', async () => {
    const result = await evaluateScriptTool({ file: 'examples/manufacturing-showcase/bearing-shaft-assembly.kcad.ts', skipMechanismCheck: true });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.parts?.count).toBe(4);
    expect(result.parts?.names).toEqual(expect.arrayContaining(['housing', 'bearing', 'retainer', 'shaft']));
  }, 120_000);
  it('reviews the limited shaft rotation without interference or mechanical errors', async () => {
    const result = await reviewCadTool({
      file: 'examples/manufacturing-showcase/bearing-shaft-assembly.kcad.ts',
      includeInterference: true, includePoseEnvelope: true,
    });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  }, 120_000);

  it('exports the retainer at its edited 3 mm thickness', async () => {
    const code = (await readFile('examples/manufacturing-showcase/bearing-shaft-assembly.kcad.ts', 'utf8'))
      .replace("param('retainerThickness', 2", "param('retainerThickness', 3");
    const exported = await runAndExport({ code, fileName: 'bearing-shaft-assembly.kcad.ts', format: 'step' });
    expect(exported.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const report = await inspectStepBuffer(Buffer.from(exported.bytes), 'bearing-shaft-assembly.kcad.ts');
    expect(report.solidCount).toBe(4);
    const retainer = report.solids.find(solid => {
      const spanX = solid.bboxExact.max[0] - solid.bboxExact.min[0];
      const spanY = solid.bboxExact.max[1] - solid.bboxExact.min[1];
      return Math.abs(spanX - 34) < 0.01 && Math.abs(spanY - 30) < 0.01;
    });
    expect(retainer).toBeDefined();
    expect(retainer!.bboxExact.max[2] - retainer!.bboxExact.min[2]).toBeCloseTo(3, 3);
  }, 120_000);
});
