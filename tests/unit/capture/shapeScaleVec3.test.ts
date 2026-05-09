// tests/unit/capture/shapeScaleVec3.test.ts
//
// Render-primitives slice — Task 6 (2026-05-09).
//
// `Shape.scale` accepts a Vec3 `[sx, sy, sz]` so non-uniform scale is
// expressible at capture time. Per-axis components land on the FeatureRecord
// transform stack as `{ op: 'scale', sx, sy, sz }`.
//
// The face-ref invariant audit
// (`tests/unit/intent/faceRefScaleAudit.test.ts`) verified that all
// FaceRef kinds survive non-uniform scale because OCCT preserves topology
// (face count + TopExp_Explorer order) under any affine transform.
//
// LOWERING NOTE: the active `replicad-opencascadejs` build does not export
// `BRepBuilderAPI_GTransform`, so non-uniform Vec3s do not lower today —
// the lowerer emits a `feature.kernel-failed` diagnostic with hint
// `kernel-failed.scale.non-uniform`. These tests cover capture only;
// the lowering integration is exercised by `scaleVec3Lowering.test.ts`.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';

describe('Shape.scale Vec3 capture', () => {
  beforeAll(async () => { await initOcct(); });

  it('uniform scale(2) still records sx=sy=sz=2 (regression)', async () => {
    const result = await runScript({
      code: `return box(10, 10, 10).scale(2);`,
      fileName: 'test.kcad.ts',
    });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].transforms).toEqual([
      { op: 'scale', sx: 2, sy: 2, sz: 2 },
    ]);
  });

  it('Vec3 [2, 1, 1] records per-axis components verbatim', async () => {
    const result = await runScript({
      code: `return box(10, 10, 10).scale([2, 1, 1]);`,
      fileName: 'test.kcad.ts',
    });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].transforms).toEqual([
      { op: 'scale', sx: 2, sy: 1, sz: 1 },
    ]);
  });

  it('Vec3 [1, 2, 3] records all three distinct axes', async () => {
    const result = await runScript({
      code: `return box(10, 10, 10).scale([1, 2, 3]);`,
      fileName: 'test.kcad.ts',
    });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].transforms).toEqual([
      { op: 'scale', sx: 1, sy: 2, sz: 3 },
    ]);
  });

  it('Vec3 [1, 1, 1] is allowed (no-op semantically, still recorded)', async () => {
    // Consistent with .translate(0, 0, 0) — the transform is captured.
    const result = await runScript({
      code: `return box(10, 10, 10).scale([1, 1, 1]);`,
      fileName: 'test.kcad.ts',
    });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].transforms).toEqual([
      { op: 'scale', sx: 1, sy: 1, sz: 1 },
    ]);
  });

  it('Vec3 with a zero component throws feature.invalid-args', async () => {
    const { kernelErrorToDiagnostic } = await import('../../../src/script-runtime/kernelErrorToDiagnostic');
    let caught: unknown;
    try {
      await runScript({
        code: `return box(10, 10, 10).scale([0, 1, 1]);`,
        fileName: 'test.kcad.ts',
      });
    } catch (e) { caught = e; }
    expect(caught).toBeDefined();
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.hint).toMatch(/invalid-args\.scale\.zero/);
  });

  it('Vec3 with a negative component throws feature.invalid-args', async () => {
    let caught: unknown;
    try {
      await runScript({
        code: `return box(10, 10, 10).scale([-1, 1, 1]);`,
        fileName: 'test.kcad.ts',
      });
    } catch (e) { caught = e; }
    expect(String(caught)).toMatch(/positive|invalid-args\.scale/i);
  });

  it('Vec3 with NaN throws feature.invalid-args', async () => {
    let caught: unknown;
    try {
      await runScript({
        code: `return box(10, 10, 10).scale([Number.NaN, 1, 1]);`,
        fileName: 'test.kcad.ts',
      });
    } catch (e) { caught = e; }
    expect(String(caught)).toMatch(/NaN|invalid-args\.scale/i);
  });

  it('chains correctly: box.scale([2,1,1]).translate(5,0,0) yields 2 transforms in order', async () => {
    const result = await runScript({
      code: `return box(10, 10, 10).scale([2, 1, 1]).translate(5, 0, 0);`,
      fileName: 'test.kcad.ts',
    });
    expect(result.records).toHaveLength(1);
    const transforms = result.records[0].transforms;
    expect(transforms).toHaveLength(2);
    expect(transforms[0]).toEqual({ op: 'scale', sx: 2, sy: 1, sz: 1 });
    expect(transforms[1].op).toBe('translate');
  });
});
