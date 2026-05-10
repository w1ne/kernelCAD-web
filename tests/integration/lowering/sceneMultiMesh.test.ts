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
//   - apply the part's `worldTransform` to vertices/normals (FK-posed),
//   - aggregate bounds across all fanned meshes,
//   - leave the existing single-shape path (plain ShapeBackend) untouched.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';
import { meshFeaturesPerFeature } from '../../../src/capture/featureMeshing';

beforeAll(async () => { await initOcct(); });

describe('meshing — SceneBackend fan-out', () => {
  it('fans solvedAssembly SceneBackend to N FeatureMesh entries with composite ids', async () => {
    const code = `
      const arm = assembly('test');
      const base = arm.part('base', box(10, 10, 10));
      const armPart = arm.part('arm',  box(10, 10, 30));
      arm.revolute('yaw', base, armPart, { axis: [0, 0, 1], origin: [0, 0, 10] });
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
      arm.revolute('yaw', base, armPart, { axis: [0, 0, 1], origin: [0, 0, 10] });
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

  it('applies worldTransform to vertices (FK-posed positions in world frame)', async () => {
    // Long arm extending +X in its local frame. With yaw=90° about Z and
    // the joint origin at [0,0,0], every +X vertex in the local frame
    // rotates to +Y in world space.
    const code = `
      const arm = assembly('test');
      const base = arm.part('base', box(10, 10, 10));
      const armPart = arm.part('arm',  box(60, 10, 10).translate(30, 0, 0));
      arm.revolute('yaw', base, armPart, { axis: [0, 0, 1], origin: [0, 0, 0] });
      return arm.solvedModel({ yaw: 90 });
    `;
    const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
    const { features } = await meshFeaturesPerFeature(records);
    const last = records[records.length - 1];

    const armMesh = features.find(f => f.featureId === `${last.id}__arm`);
    expect(armMesh).toBeDefined();

    // Walk all vertices of the arm mesh in world space; collect the
    // per-axis extents. In its local frame the arm spans roughly x ∈ [0, 60].
    // After 90° yaw about Z (joint origin at world origin), x-extent in local
    // becomes y-extent in world; the world-space x-extent collapses to ≤ 10
    // (the box's local Y half-width).
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
    // World Y-extent picks up the long arm; world X-extent stays small.
    expect(maxY).toBeGreaterThan(55);
    expect(maxX - minX).toBeLessThanOrEqual(15);
  });

  it('aggregates bounds across all fanned meshes', async () => {
    const code = `
      const arm = assembly('test');
      const base = arm.part('base', box(10, 10, 10));
      const armPart = arm.part('arm',  box(60, 10, 10).translate(30, 0, 0));
      arm.revolute('yaw', base, armPart, { axis: [0, 0, 1], origin: [0, 0, 0] });
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
});
