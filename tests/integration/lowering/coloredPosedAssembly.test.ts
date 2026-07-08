// tests/integration/lowering/coloredPosedAssembly.test.ts
//
// Regression coverage for issue #538: "no path yields a POSED assembly with
// per-part COLOR that also renders."
//
// On develop the supported colored + posed RENDER path is to return the
// reactive `Assembly.solvedModel(poses)` Scene directly. Its lowerer emits a
// SceneBackend whose parts carry BOTH the FK-posed `worldTransform` and the
// per-part `color` walked from each source shape; the meshing fan-out
// (`meshFeaturesPerFeature` — the actual render mesh source) turns that into
// one colored, posed FeatureMesh per part.
//
// These tests use the public body-tree `assembly.revolute()` joint (issue
// #535) rather than a connector/mate so the regression matches the exact
// authoring surface reported on #538. They pin:
//   1. solvedModel(poses) render path: per-part color preserved AND the posed
//      child part's WORLD geometry moves vs the rest pose (not the static
//      rest pose the deployed/older server rendered).
//   2. solvedModel(poses).toCompound() export path: lowers to a posed
//      TopoDS_Compound (bbox reflects the pose) preserving per-part topological
//      identity — the supported single-Shape posed export for STEP/downstream.
//   3. Documented non-paths: solve(poses).toScene() is a snapshot Scene with
//      no upstream feature (renders the chain tail, not a posed scene) and
//      .toScene().toCompound() throws a hint pointing at solvedModel(...).
//
// Together (1)+(2) resolve the core of #538; (3) locks in the guard rails.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { meshFeaturesPerFeature, type FeatureMesh } from '../../../src/modeling/capture/featureMeshing';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { Scene } from '../../../src/modeling/validation/scene';
import { KernelError } from '../../../src/shared/intent/kernelError';

beforeAll(async () => { await initOcct(); });

/** Apply a column-major 4x4 (FeatureMesh.transform) to a local-frame point. */
function applyMat4(m: readonly number[] | undefined, p: readonly [number, number, number]): [number, number, number] {
  if (!m) return [p[0], p[1], p[2]];
  const [x, y, z] = p;
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

/** World-space AABB of a fanned FeatureMesh: local verts pushed through the
 *  viewport-side `transform` (where the pose lives for body-tree joints). */
function worldBbox(fm: FeatureMesh): { min: [number, number, number]; max: [number, number, number] } {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const f of fm.faces) {
    const v = f.vertices;
    for (let i = 0; i < v.length; i += 3) {
      const w = applyMat4(fm.transform, [v[i], v[i + 1], v[i + 2]]);
      for (let k = 0; k < 3; k++) {
        if (w[k] < min[k]) min[k] = w[k];
        if (w[k] > max[k]) max[k] = w[k];
      }
    }
  }
  return { min, max };
}

// Two-part body-tree arm: a fixed colored base and a colored link driven by a
// single revolute about +Z at the shoulder. The link extends +X in its local
// frame, so a 90° shoulder pose swings it to +Y in world space.
const armScript = (shoulderDeg: number) => `
  const arm = assembly('robot');
  const base = arm.part('base', box(20, 20, 10).color('plate'));
  const link = arm.part('link', box(60, 8, 8).translate(30, 0, 0).color('beam'));
  arm.revolute('shoulder', base, link, { axis: [0, 0, 1], origin: [0, 0, 5] });
  return arm.solvedModel({ shoulder: ${shoulderDeg} });
`;

describe('issue #538 — colored + posed assembly export', () => {
  it('solvedModel(poses) renders per-part color AND the joint pose (not the rest pose)', async () => {
    const rest = await runScript({ code: armScript(0), fileName: 'rest.kcad.ts' });
    const posed = await runScript({ code: armScript(90), fileName: 'posed.kcad.ts' });

    // Both lower into the SceneBackend mesh fan-out (the render path).
    expect(rest.records[rest.records.length - 1].kind).toBe('solvedAssembly');
    const meshRest = await meshFeaturesPerFeature(rest.records);
    const meshPosed = await meshFeaturesPerFeature(posed.records);
    expect(meshRest.failedFeatureIds).toEqual([]);
    expect(meshPosed.failedFeatureIds).toEqual([]);

    // (a) COLORED: each part fans out to its own FeatureMesh carrying the
    //     per-part color walked from the source shape.
    const baseRest = meshRest.features.find((f) => f.assemblyPartName === 'base');
    const linkRest = meshRest.features.find((f) => f.assemblyPartName === 'link');
    const linkPosed = meshPosed.features.find((f) => f.assemblyPartName === 'link');
    expect(baseRest?.color).toBe('plate');
    expect(linkRest?.color).toBe('beam');
    expect(linkPosed?.color).toBe('beam');

    // (b) POSED: the link's WORLD geometry actually moves. At rest the link
    //     spans +X (≈[30,90]); at 90° about +Z it swings to span +Y (≈[30,90])
    //     with X collapsing near the joint. A static-rest-pose render (the
    //     deployed/older server bug) would leave these identical.
    const bbRest = worldBbox(linkRest!);
    const bbPosed = worldBbox(linkPosed!);
    expect(bbRest.max[0]).toBeGreaterThan(80);   // rest: extends far in +X
    expect(bbPosed.max[1]).toBeGreaterThan(80);  // posed: extends far in +Y
    expect(bbPosed.max[0]).toBeLessThan(40);     // posed: X extent collapsed
    expect(Math.abs(bbPosed.max[0] - bbRest.max[0])).toBeGreaterThan(40);
  });

  it('solvedModel(poses).toCompound() lowers to a posed TopoDS_Compound (per-part identity preserved)', async () => {
    const compoundScript = (shoulderDeg: number) => `
      const arm = assembly('robot');
      const base = arm.part('base', box(20, 20, 10).color('plate'));
      const link = arm.part('link', box(60, 8, 8).translate(30, 0, 0).color('beam'));
      arm.revolute('shoulder', base, link, { axis: [0, 0, 1], origin: [0, 0, 5] });
      return (await arm.solvedModel({ shoulder: ${shoulderDeg} })).toCompound();
    `;
    const lower = async (deg: number) => {
      const { records } = await runScript({ code: compoundScript(deg), fileName: 'c.kcad.ts' });
      const engine = new RecomputeEngine(new OcctLowerer());
      const r = await engine.run(records);
      const last = records[records.length - 1];
      expect(last.kind).toBe('assemblyExport');
      expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      return r.shapes.get(last.id) as OcctBackend;
    };

    const rest = await lower(0);
    const posed = await lower(90);
    expect(rest).toBeInstanceOf(OcctBackend);
    expect(posed).toBeInstanceOf(OcctBackend);

    // Compound (not fused): volume = sum of the two part volumes, unchanged
    // by the rigid pose — identity is preserved, geometry isn't merged.
    expect(rest.volume()).toBeCloseTo(posed.volume(), 3);

    // The pose is baked into the exported geometry: the link's far end moves
    // from +X at rest to +Y when posed 90°.
    const bbRest = rest.boundingBox();
    const bbPosed = posed.boundingBox();
    expect(bbRest.max[0]).toBeGreaterThan(80);
    expect(bbPosed.max[1]).toBeGreaterThan(80);
    expect(bbPosed.max[0]).toBeLessThan(40);
  });

  it('solve(poses).toScene() is a non-rendering snapshot; .toCompound() points to solvedModel', async () => {
    // Snapshot Scene from the in-script FK handle. It has NO upstream feature
    // id, so returning it from a script renders the chain tail (an
    // assemblyJoint record), not a posed multi-part scene — hence the "empty
    // server-side render" on #538. The supported render path is to return
    // solvedModel(poses) directly (test 1). Documented, not a defect.
    const { records, returnValue } = await runScript({
      code: `
        const arm = assembly('robot');
        const base = arm.part('base', box(20, 20, 10).color('plate'));
        const link = arm.part('link', box(60, 8, 8).translate(30, 0, 0).color('beam'));
        arm.revolute('shoulder', base, link, { axis: [0, 0, 1], origin: [0, 0, 5] });
        return arm.solve({ shoulder: 90 }).toScene();
      `,
      fileName: 'snapshot.kcad.ts',
    });
    const scene = returnValue as Scene;
    expect(scene).toBeInstanceOf(Scene);
    expect(scene.__sourceFeatureId()).toBeUndefined();
    expect(records[records.length - 1].kind).not.toBe('solvedAssembly');

    // toCompound() on the snapshot throws with a hint pointing at the
    // supported posed-export path.
    let captured: unknown;
    try { scene.toCompound(); } catch (e) { captured = e; }
    expect(captured).toBeInstanceOf(KernelError);
    expect((captured as KernelError).hint).toContain('compound-not-supported-on-snapshot');
    expect((captured as KernelError).hint).toContain('solvedModel(poses).toCompound()');
  });
});
