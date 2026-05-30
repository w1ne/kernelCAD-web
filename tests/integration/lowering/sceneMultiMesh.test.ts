// tests/integration/lowering/sceneMultiMesh.test.ts
//
// Integration coverage for the meshing-layer fan-out of SceneBackend into
// N FeatureMesh entries (one per assembly part). After Tasks 4 + 5 the
// `solvedAssembly` and `assemblyModel` lowerer cases emit a SceneBackend;
// this test asserts the meshing pipeline now fans those out into a list of
// per-part FeatureMesh entries that:
//   - carry composite featureIds shaped `${assemblyFeatureId}__${partName}`,
//   - declare the assembly feature as their sole predecessor,
//   - preserve per-part color from `SceneBackendPart.color`,
//   - preserve each part mesh in local coordinates and carry `worldTransform`
//     as viewport transform metadata,
//   - aggregate bounds across all fanned meshes,
//   - leave the existing single-shape path (plain ShapeBackend) untouched.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { meshFeaturesPerFeature } from '../../../src/modeling/capture/featureMeshing';

beforeAll(async () => { await initOcct(); });

describe('meshing — SceneBackend fan-out', () => {
  it('fans solvedAssembly SceneBackend to N FeatureMesh entries with composite ids', async () => {
    const code = `
      const arm = assembly('test');
      const base = arm.part('base', box(10, 10, 10));
      const armPart = arm.part('arm',  box(10, 10, 30));
      base.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 10] }, axis: [0, 0, 1] });
      armPart.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('yaw', 'base.yaw', 'arm.yaw', 'revolute');
      return arm.solvedModel({ yaw: 0 });
    `;
    const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
    const { features, failedFeatureIds } = await meshFeaturesPerFeature(records);
    expect(failedFeatureIds).toEqual([]);

    const last = records[records.length - 1];
    expect(last.kind).toBe('solvedAssembly');

    // The fanned entries: one per part, composite id, predecessors → assembly id.
    const fanned = features.filter(f => f.featureId.startsWith(`${last.id}__`));
    expect(fanned).toHaveLength(2);

    const ids = fanned.map(f => f.featureId).sort();
    expect(ids).toEqual([`${last.id}__arm`, `${last.id}__base`]);

    for (const fm of fanned) {
      expect(fm.predecessors).toEqual([last.id]);
      expect(fm.featureKind).toBe('solvedAssembly');
    }
  });

  it('preserves per-part colors on fanned FeatureMesh entries', async () => {
    const code = `
      const arm = assembly('test');
      const base = arm.part('base', box(10, 10, 10).color('plate'));
      const armPart = arm.part('arm',  box(10, 10, 30).color('beam'));
      base.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 10] }, axis: [0, 0, 1] });
      armPart.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('yaw', 'base.yaw', 'arm.yaw', 'revolute');
      return arm.solvedModel({ yaw: 0 });
    `;
    const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
    const { features } = await meshFeaturesPerFeature(records);
    const last = records[records.length - 1];

    const baseMesh = features.find(f => f.featureId === `${last.id}__base`);
    const armMesh = features.find(f => f.featureId === `${last.id}__arm`);
    expect(baseMesh?.color).toBe('plate');
    expect(armMesh?.color).toBe('beam');
  });

  it('keeps vertices local and carries worldTransform for viewport posing', async () => {
    // Long arm extending +X in its local frame. With yaw=90° about Z and
    // the joint origin at [0,0,0], every +X vertex in the local frame
    // rotates to +Y in world space.
    const code = `
      const arm = assembly('test');
      const base = arm.part('base', box(10, 10, 10));
      const armPart = arm.part('arm',  box(60, 10, 10).translate(30, 0, 0));
      base.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      armPart.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('yaw', 'base.yaw', 'arm.yaw', 'revolute');
      return arm.solvedModel({ yaw: 90 });
    `;
    const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
    const { features } = await meshFeaturesPerFeature(records);
    const last = records[records.length - 1];

    const armMesh = features.find(f => f.featureId === `${last.id}__arm`);
    expect(armMesh).toBeDefined();

    expect(armMesh!.assemblyPartName).toBe('arm');
    expect(armMesh!.assemblyFeatureId).toBe(last.id);
    expect(armMesh!.transform).toHaveLength(16);
    expect(armMesh!.transform![0]).toBeCloseTo(0, 5);
    expect(armMesh!.transform![1]).toBeCloseTo(1, 5);
    expect(armMesh!.transform![4]).toBeCloseTo(-1, 5);
    expect(armMesh!.transform![5]).toBeCloseTo(0, 5);

    // Walk all vertices of the arm mesh in local space. The long local X
    // extent must remain intact; the viewport transform is responsible for
    // rotating it to world +Y.
    let maxX = -Infinity, maxY = -Infinity;
    let minX = Infinity, minY = Infinity;
    for (const face of armMesh!.faces) {
      const v = face.vertices;
      for (let i = 0; i < v.length; i += 3) {
        if (v[i] > maxX) maxX = v[i];
        if (v[i] < minX) minX = v[i];
        if (v[i + 1] > maxY) maxY = v[i + 1];
        if (v[i + 1] < minY) minY = v[i + 1];
      }
    }
    expect(maxX).toBeGreaterThan(55);
    expect(maxY - minY).toBeLessThanOrEqual(15);
  });

  it('aggregates bounds across all fanned meshes', async () => {
    const code = `
      const arm = assembly('test');
      const base = arm.part('base', box(10, 10, 10));
      const armPart = arm.part('arm',  box(60, 10, 10).translate(30, 0, 0));
      base.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      armPart.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('yaw', 'base.yaw', 'arm.yaw', 'revolute');
      return arm.solvedModel({ yaw: 0 });
    `;
    const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
    const { bounds } = await meshFeaturesPerFeature(records);

    // Base box centered at origin: spans ~[-5,5] each axis.
    // Arm box (60×10×10) translated +30 in X: spans x ∈ [0, 60].
    // Union envelope: x ∈ [≈-5, ≈60], y ∈ [≈-5, 5], z ∈ [≈-5, 5].
    expect(bounds.max[0]).toBeGreaterThan(55);
    expect(bounds.min[0]).toBeLessThanOrEqual(0);
    expect(bounds.max[1] - bounds.min[1]).toBeGreaterThanOrEqual(10);
    expect(bounds.max[2] - bounds.min[2]).toBeGreaterThanOrEqual(10);
  });

  it('falls back to single-shape path when event.shape is a ShapeBackend (regression)', async () => {
    // Plain box → existing single-shape lowering path → exactly one FeatureMesh.
    const code = `return box(20, 30, 40);`;
    const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
    const { features } = await meshFeaturesPerFeature(records);
    expect(features).toHaveLength(1);
    expect(features[0].featureKind).toBe('box');
    // No composite-id artefacts on the single-shape path.
    expect(features[0].featureId.includes('__')).toBe(false);
  });

  // Construction-closure filter: when an assembly's terminal `solvedAssembly` /
  // `assemblyModel` shape lands in meshing, the SceneBackend fan-out is the
  // ONLY mesh source the renderer wants. Intermediate boxes/cylinders/fillets/
  // holes/booleans used to BUILD each part are construction debris — they'd
  // render at LOCAL frame stacked at the origin and drown out the colored
  // assembly fan-out. Pre-Task-9 the renderer was getting both, producing a
  // gray-soup hero image; the closure filter scopes meshing to the fan-out.

  it('filter active: solvedAssembly suppresses construction-input intermediates', async () => {
    // Each part is built from a non-trivial chain: box → fillet. Without the
    // filter, both intermediates would emit FeatureMesh entries (4 total),
    // alongside the 2 fan-out entries for a total of 6. With the filter we
    // expect ONLY the 2 fan-out entries.
    const code = `
      const arm = assembly('test');
      const base = arm.part('base', box(10, 10, 10).fillet(0.5));
      const armPart = arm.part('arm',  box(10, 10, 30).fillet(0.5));
      base.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 10] }, axis: [0, 0, 1] });
      armPart.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('yaw', 'base.yaw', 'arm.yaw', 'revolute');
      return arm.solvedModel({ yaw: 0 });
    `;
    const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
    const { features, failedFeatureIds } = await meshFeaturesPerFeature(records);
    expect(failedFeatureIds).toEqual([]);

    // Exactly the 2 fan-out entries; nothing else.
    expect(features).toHaveLength(2);

    const last = records[records.length - 1];
    expect(last.kind).toBe('solvedAssembly');
    for (const fm of features) {
      expect(fm.featureId.startsWith(`${last.id}__`)).toBe(true);
    }
  });

  it('filter active: assemblyModel also suppresses construction-input intermediates', async () => {
    // Same shape as the solvedAssembly test, but using arm.model() — the
    // closure filter must apply to assemblyModel too.
    const code = `
      const arm = assembly('test');
      const base = arm.part('base', box(10, 10, 10).fillet(0.5));
      const armPart = arm.part('arm',  box(10, 10, 30).fillet(0.5));
      base.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 10] }, axis: [0, 0, 1] });
      armPart.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('yaw', 'base.yaw', 'arm.yaw', 'revolute');
      return arm.model();
    `;
    const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
    const { features, failedFeatureIds } = await meshFeaturesPerFeature(records);
    expect(failedFeatureIds).toEqual([]);

    expect(features).toHaveLength(2);
    const last = records[records.length - 1];
    expect(last.kind).toBe('assemblyModel');
    for (const fm of features) {
      expect(fm.featureId.startsWith(`${last.id}__`)).toBe(true);
    }
  });

  it('filter inactive: non-assembly script emits all FeatureMesh entries', async () => {
    // No assemblyPart records → closure is empty → every compiled feature
    // emits a FeatureMesh as before. box→fillet should yield 2 entries.
    const code = `return box(10, 10, 10).fillet(0.5);`;
    const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
    const { features, failedFeatureIds } = await meshFeaturesPerFeature(records);
    expect(failedFeatureIds).toEqual([]);

    expect(features).toHaveLength(2);
    const kinds = features.map(f => f.featureKind).sort();
    expect(kinds).toEqual(['box', 'fillet']);
    // No composite-id artefacts — single-shape paths only.
    for (const fm of features) {
      expect(fm.featureId.includes('__')).toBe(false);
    }
  });
});
