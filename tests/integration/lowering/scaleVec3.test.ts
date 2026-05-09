// tests/integration/lowering/scaleVec3.test.ts
//
// Render-primitives slice — Task 6 (2026-05-09).
//
// Lowering integration for `Shape.scale` Vec3 form. Two surfaces:
//
// 1. Uniform path (regression): `.scale([2, 2, 2])` and `.scale(2)` both
//    produce a 2x bounding box.
//
// 2. Non-uniform path: today this lands as a `feature.kernel-failed`
//    diagnostic with the `kernel-failed.scale.non-uniform` hint, because
//    the active `replicad-opencascadejs` build does not export
//    `BRepBuilderAPI_GTransform`. The capture-side encoding
//    (per-axis sx/sy/sz on the FeatureRecord) is already in place and
//    covered at `tests/unit/capture/shapeScaleVec3.test.ts`.
//
// When the WASM build ships GTransform, flip the non-uniform expectation
// from "produces diagnostic" to "produces correctly scaled bounding box".

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/backends/occt/occtLowerer';
import type { CompilerDiagnostic } from '../../../src/diagnostics/diagnostic';

interface LowerResult {
  shape: OcctBackend | undefined;
  diagnostics: CompilerDiagnostic[];
}

async function lowerScript(code: string): Promise<LowerResult> {
  const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(records);
  const last = records[records.length - 1];
  return {
    shape: r.shapes.get(last.id) as OcctBackend | undefined,
    diagnostics: r.diagnostics,
  };
}

describe('scale Vec3 lowering', () => {
  beforeAll(async () => { await initOcct(); });

  it('uniform scale(2) doubles the bounding box (regression)', async () => {
    const { shape, diagnostics } = await lowerScript(`
      return box(10, 10, 10).scale(2);
    `);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(shape).toBeDefined();
    const bb = shape!.boundingBox();
    const dx = bb.max[0] - bb.min[0];
    const dy = bb.max[1] - bb.min[1];
    const dz = bb.max[2] - bb.min[2];
    // box(10) is centered at origin; scale(2) → 20mm cube.
    expect(dx).toBeCloseTo(20, 3);
    expect(dy).toBeCloseTo(20, 3);
    expect(dz).toBeCloseTo(20, 3);
  });

  it('uniform Vec3 [2, 2, 2] doubles the bounding box', async () => {
    const { shape, diagnostics } = await lowerScript(`
      return box(10, 10, 10).scale([2, 2, 2]);
    `);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(shape).toBeDefined();
    const bb = shape!.boundingBox();
    const dx = bb.max[0] - bb.min[0];
    const dy = bb.max[1] - bb.min[1];
    const dz = bb.max[2] - bb.min[2];
    expect(dx).toBeCloseTo(20, 3);
    expect(dy).toBeCloseTo(20, 3);
    expect(dz).toBeCloseTo(20, 3);
  });

  it('non-uniform Vec3 [2, 1, 1] emits feature.kernel-failed today (BRepBuilderAPI_GTransform unavailable)', async () => {
    // TODO(render-primitives): once the OCCT WASM build ships
    // BRepBuilderAPI_GTransform, replace this expectation with a
    // bounding-box check (dx ≈ 20, dy ≈ 10, dz ≈ 10).
    const { shape, diagnostics } = await lowerScript(`
      return box(10, 10, 10).scale([2, 1, 1]);
    `);
    const errors = diagnostics.filter(d => d.severity === 'error');
    expect(errors.length).toBeGreaterThan(0);
    const scaleErr = errors.find(d => d.code === 'feature.kernel-failed' && /non-uniform scale/i.test(d.message));
    expect(scaleErr).toBeDefined();
    expect(scaleErr!.hint).toMatch(/kernel-failed\.scale\.non-uniform/);
    // Shape is preserved at its pre-scale extents (10mm cube).
    if (shape !== undefined) {
      const bb = shape.boundingBox();
      const dx = bb.max[0] - bb.min[0];
      expect(dx).toBeCloseTo(10, 3);
    }
  });
});
