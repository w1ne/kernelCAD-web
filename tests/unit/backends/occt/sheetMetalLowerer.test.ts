import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/kernel/backends/occt/occtLowerer';
import type { CompilerDiagnostic } from '../../../../src/shared/diagnostics/diagnostic';

async function lowerScript(code: string) {
  const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(records);
  const last = records[records.length - 1];
  const shape = r.shapes.get(last.id) as OcctBackend | undefined;
  return { shape, diagnostics: r.diagnostics, recordCount: records.length, records };
}

describe('sheetMetalBend lowering — single bend', () => {
  beforeAll(async () => { await initOcct(); });

  it('L-bracket: 90 degree fold along x=50 produces a non-empty bent body', async () => {
    const code = `
      const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
      const blank = sheetMetal(s, { thickness: 2, kFactor: 0.38 });
      return blank.bend({ atX: 50 }, 90, 3);
    `;
    const { shape, diagnostics } = await lowerScript(code);
    // Slice-1 sewing may emit warnings — assert no error-severity diags.
    const errors = (diagnostics as CompilerDiagnostic[]).filter(d => d.severity === 'error');
    expect(errors).toEqual([]);
    expect(shape).toBeDefined();
    const bb = shape!.boundingBox();
    // Bent L-bracket: one half is lifted from z=0..2 to z=0..50ish; bbox
    // height should be greater than the flat thickness.
    expect(bb.max[2] - bb.min[2]).toBeGreaterThan(10);
  });

  it('rejects .bend() on non-sheet-metal Shape with feature.invalid-args', async () => {
    const code = `
      return box(20, 20, 20).bend({ atX: 10 }, 90, 3);
    `;
    const { diagnostics } = await lowerScript(code);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0]!.code).toBe('feature.invalid-args');
  });

  it('persists bendRecord metadata for flattenPattern consumption', async () => {
    const code = `
      const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
      const blank = sheetMetal(s, { thickness: 2, kFactor: 0.38 });
      return blank.bend({ atX: 50 }, 90, 3);
    `;
    const { records } = await lowerScript(code);
    const bend = records.find(r => r.kind === 'sheetMetalBend');
    expect(bend).toBeDefined();
    const md = bend!.metadata as { bendRecord?: { axisDirection: [number, number, number] } } | undefined;
    expect(md?.bendRecord).toBeDefined();
    expect(md?.bendRecord?.axisDirection).toEqual([0, 1, 0]);
  });
});

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
