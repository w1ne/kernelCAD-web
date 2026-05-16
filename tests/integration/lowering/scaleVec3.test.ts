// tests/integration/lowering/scaleVec3.test.ts
//
// Lowering integration for `Shape.scale` Vec3 form. Both uniform and
// non-uniform paths produce a correctly scaled bounding box; non-uniform
// lowers via gp_GTrsf + BRepBuilderAPI_GTransform.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/kernel/backends/occt/occtLowerer';
import type { CompilerDiagnostic } from '../../../src/shared/diagnostics/diagnostic';

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

  it('non-uniform Vec3 [2, 1, 1] stretches X only', async () => {
    const { shape, diagnostics } = await lowerScript(`
      return box(10, 10, 10).scale([2, 1, 1]);
    `);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(shape).toBeDefined();
    const bb = shape!.boundingBox();
    const dx = bb.max[0] - bb.min[0];
    const dy = bb.max[1] - bb.min[1];
    const dz = bb.max[2] - bb.min[2];
    expect(dx).toBeCloseTo(20, 3);
    expect(dy).toBeCloseTo(10, 3);
    expect(dz).toBeCloseTo(10, 3);
  });

  it('non-uniform Vec3 [1, 1, 2] stretches Z only (cylinder)', async () => {
    const { shape, diagnostics } = await lowerScript(`
      return cylinder(20, 4).scale([1, 1, 2]);
    `);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(shape).toBeDefined();
    const bb = shape!.boundingBox();
    const dz = bb.max[2] - bb.min[2];
    expect(dz).toBeCloseTo(40, 3);
  });
});
