import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/backends/occt/occtBackend';
import { runScript } from '../../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/backends/occt/occtLowerer';
import type { CompilerDiagnostic } from '../../../../src/diagnostics/diagnostic';

async function lowerScript(code: string) {
  const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(records);
  const last = records[records.length - 1];
  const shape = r.shapes.get(last.id) as OcctBackend | undefined;
  return { shape, diagnostics: r.diagnostics, recordCount: records.length, records };
}

describe('sheetMetal lowering — flat body via extrude pipeline', () => {
  beforeAll(async () => { await initOcct(); });

  it('60x100x2 flat body has expected volume', async () => {
    const code = `
      const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
      return sheetMetal(s, { thickness: 2, kFactor: 0.38 });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    expect(diagnostics).toEqual([]);
    expect(shape).toBeDefined();
    const vol = shape!.volume();
    expect(vol).toBeCloseTo(100 * 60 * 2, 1); // 12_000 mm^3
  });

  it('bounding box matches sketch extent + thickness', async () => {
    const code = `
      const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
      return sheetMetal(s, { thickness: 2, kFactor: 0.4 });
    `;
    const { shape } = await lowerScript(code);
    const bb = shape!.boundingBox();
    expect(bb.max[0] - bb.min[0]).toBeCloseTo(100, 1);
    expect(bb.max[1] - bb.min[1]).toBeCloseTo(60, 1);
    expect(bb.max[2] - bb.min[2]).toBeCloseTo(2, 1);
  });
});
