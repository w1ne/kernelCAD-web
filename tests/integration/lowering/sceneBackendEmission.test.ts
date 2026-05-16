// tests/integration/lowering/sceneBackendEmission.test.ts
//
// Integration coverage for the SceneBackend emission path of the
// `solvedAssembly` lowerer case. Replaces the legacy "boolean union of all
// posed parts" output with a multi-body SceneBackend that carries each
// part's local-frame shape, world transform, and color attribution.
//
// The recompute engine still runs forward-kinematics; the change is purely
// in step 5 of the lowerer case (no boolean union of posed parts). This
// test asserts:
//   - The lowered output is a SceneBackend (per `isSceneBackend`).
//   - It has one entry per assembly part, with `name` matching
//     `assembly.part(name, ...)`.
//   - Each part carries a `worldTransform` (Transform instance from
//     `src/runtime/se3`) — identity for the body-tree root, non-identity
//     after a non-zero pose on a downstream joint.
//   - The assembly's `assemblyName` propagates onto the SceneBackend.
//   - Per-part color is resolved via `lookupSourceColor` (i.e. the same
//     attribution rules used elsewhere in the backend).
//   - No boolean union is performed — each part's shape is the original
//     local-frame OcctBackend (a primitive, not a fused TopoDS_Compound),
//     verified by checking the part shape's bbox matches its primitive
//     spec (a unioned compound would carry the FK-translated bbox).

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { isSceneBackend, type SceneBackend } from '../../../src/kernel/backends/sceneBackend';
import { Transform } from '../../../src/shared/runtime/se3';
import type { CompilerDiagnostic } from '../../../src/shared/diagnostics/diagnostic';

interface LowerResult {
  shape: unknown;
  diagnostics: CompilerDiagnostic[];
}

async function lowerScript(code: string): Promise<LowerResult> {
  const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(records);
  const last = records[records.length - 1];
  return {
    shape: r.shapes.get(last.id),
    diagnostics: r.diagnostics,
  };
}

function expectIdentity(t: Transform): void {
  const m = t.toMat4();
  // Column-major identity.
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      const expected = col === row ? 1 : 0;
      expect(m[col * 4 + row]).toBeCloseTo(expected, 9);
    }
  }
}

function isNonIdentity(t: Transform): boolean {
  const m = t.toMat4();
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      const expected = col === row ? 1 : 0;
      if (Math.abs(m[col * 4 + row] - expected) > 1e-9) return true;
    }
  }
  return false;
}

describe('solvedAssembly lowerer — SceneBackend emission', () => {
  beforeAll(async () => { await initOcct(); });

  it('emits SceneBackend with N parts and per-part worldTransforms', async () => {
    const { shape, diagnostics } = await lowerScript(`
      const arm = assembly('test');
      const base = arm.part('base', box(10, 10, 10));
      const armPart = arm.part('arm',  box(10, 10, 30));
      arm.revolute('yaw', base, armPart, { axis: [0, 0, 1], origin: [0, 0, 10] });
      return arm.solvedModel({ yaw: 90 });
    `);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(isSceneBackend(shape)).toBe(true);
    const scene = shape as SceneBackend;
    expect(scene.assemblyName).toBe('test');
    expect(scene.parts.length).toBe(2);

    expect(scene.parts[0].name).toBe('base');
    expect(scene.parts[1].name).toBe('arm');

    expect(scene.parts[0].worldTransform).toBeInstanceOf(Transform);
    expect(scene.parts[1].worldTransform).toBeInstanceOf(Transform);

    // Root part of the body tree carries identity world transform.
    expectIdentity(scene.parts[0].worldTransform);
    // Child of revolute at yaw=90 is non-identity (rotated about Z).
    expect(isNonIdentity(scene.parts[1].worldTransform)).toBe(true);
  });

  it('preserves per-part colors via lookupSourceColor', async () => {
    const { shape, diagnostics } = await lowerScript(`
      const arm = assembly('test');
      const base = arm.part('base', box(10, 10, 10).color('plate'));
      const armPart = arm.part('arm',  box(10, 10, 30).color('beam'));
      arm.revolute('yaw', base, armPart, { axis: [0, 0, 1], origin: [0, 0, 10] });
      return arm.solvedModel({ yaw: 0 });
    `);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(isSceneBackend(shape)).toBe(true);
    const scene = shape as SceneBackend;
    const byName = new Map(scene.parts.map(p => [p.name, p]));
    expect(byName.get('base')?.color).toBe('plate');
    expect(byName.get('arm')?.color).toBe('beam');
  });

  it('does NOT boolean-union the posed parts (each part stays in its local frame)', async () => {
    // Geometry: two centered-corner boxes, joint origin at [0,0,10] with
    // a *non-zero* pose. If the lowerer still unioned the posed children,
    // each part shape's bbox would reflect the FK translation/rotation. We
    // assert the part shapes are still primitive boxes in their local
    // frames (no FK applied) — i.e. the worldTransform travels with the
    // part, not baked into its mesh.
    const { shape, diagnostics } = await lowerScript(`
      const arm = assembly('test');
      const base = arm.part('base', box(10, 10, 10));
      // Long arm extending +X (so a 90° yaw would visibly remap the bbox).
      const armPart = arm.part('arm',  box(60, 10, 10).translate(30, 0, 0));
      arm.revolute('yaw', base, armPart, { axis: [0, 0, 1], origin: [0, 0, 0] });
      return arm.solvedModel({ yaw: 90 });
    `);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(isSceneBackend(shape)).toBe(true);
    const scene = shape as SceneBackend;

    // arm part's local-frame shape spans x in [0, 60] (translated by 30,
    // box centered around its own origin → [0, 60]). If the lowerer had
    // applied the 90° yaw to the part shape, the bbox.max[0] would be ~5
    // (the box's half-width in its rotated state), not ~60.
    const armShape = scene.parts[1].shape as OcctBackend;
    const bb = armShape.boundingBox();
    expect(bb.max[0]).toBeGreaterThan(55); // local-frame: still extends to ~60 in +X
    expect(bb.max[1]).toBeLessThanOrEqual(10);    // local-frame: Y stays at half-width
    expect(bb.min[0]).toBeGreaterThanOrEqual(0);  // local-frame: not yawed onto -X

    // Sanity: the base part shape is also a local-frame box (unrotated).
    const baseShape = scene.parts[0].shape as OcctBackend;
    const baseBb = baseShape.boundingBox();
    expect(baseBb.max[0] - baseBb.min[0]).toBeCloseTo(10, 5);
    expect(baseBb.max[1] - baseBb.min[1]).toBeCloseTo(10, 5);
    expect(baseBb.max[2] - baseBb.min[2]).toBeCloseTo(10, 5);
  });
});
