// src/capture/featureMeshing.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../backends/occt/occtBackend';
import { runScript } from '../script-runtime/runScript';
import { meshFeaturesPerFeature } from './featureMeshing';

beforeAll(async () => {
  await initOcct();
});

describe('meshFeaturesPerFeature', () => {
  it('returns one entry per feature in dependency order', async () => {
    const code = `
      const plate = box(50, 50, 8);
      const hole = cylinder(8, 6).translate(25, 25, -1);
      return plate.subtract(hole);
    `;
    const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
    const { features, bounds } = await meshFeaturesPerFeature(records);

    expect(features).toHaveLength(records.length);
    expect(features.map(f => f.featureId)).toEqual(records.map(r => r.id));
    // The boolean feature has 2 predecessors
    const boolean = features.find(f => f.featureKind === 'boolean')!;
    expect(boolean.predecessors).toHaveLength(2);
    expect(boolean.op).toBe('subtract');

    // Bounds enclose the plate (50×50×8)
    expect(bounds.max[0] - bounds.min[0]).toBeGreaterThanOrEqual(50);
    expect(bounds.max[1] - bounds.min[1]).toBeGreaterThanOrEqual(50);
  });

  it('each feature carries its own faces (cylinder = 3, box = 6)', async () => {
    const code = `
      const a = box(10, 10, 10);
      const b = cylinder(5, 3);
      return a;
    `;
    const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
    const { features } = await meshFeaturesPerFeature(records);

    const boxMesh = features.find(f => f.featureKind === 'box')!;
    const cylMesh = features.find(f => f.featureKind === 'cylinder')!;
    expect(boxMesh.faces).toHaveLength(6);
    expect(cylMesh.faces).toHaveLength(3);
  });

  it('aggregates AABB across all features', async () => {
    const code = `return box(20, 30, 40);`;
    const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
    const { bounds } = await meshFeaturesPerFeature(records);
    expect(bounds.max[0] - bounds.min[0]).toBeCloseTo(20, 0);
    expect(bounds.max[1] - bounds.min[1]).toBeCloseTo(30, 0);
    expect(bounds.max[2] - bounds.min[2]).toBeCloseTo(40, 0);
  });

  it('captures failed feature IDs in failedFeatureIds', async () => {
    // Record A = valid box (no inputs, succeeds). Record B = sketch with no
    // commands, which the lowerer rejects with an error diagnostic and emits
    // feature.failed. Both nodes must appear in the records array so
    // DependencyGraph can register them before addEdge is called.
    const recA: import('../intent/featureRecord').FeatureRecord = {
      id: 'feat-a',
      kind: 'box',
      inputs: {},
      params: {
        x: { expression: '10', evaluated: 10 },
        y: { expression: '10', evaluated: 10 },
        z: { expression: '10', evaluated: 10 },
      },
      transforms: [],
      suppressed: false,
    };
    const recB: import('../intent/featureRecord').FeatureRecord = {
      id: 'feat-b',
      kind: 'sketch',
      // references recA so the edge is registered; but the lowerer will fail
      // because metadata.commands is empty — emitting feature.failed for feat-b
      inputs: { base: { kind: 'feature', id: 'feat-a' } },
      params: {},
      transforms: [],
      suppressed: false,
      metadata: { commands: [] },   // empty → lowerer error diagnostic
    };
    const { features, failedFeatureIds } = await meshFeaturesPerFeature([recA, recB]);
    expect(failedFeatureIds).toContain('feat-b');
    // feat-a compiled successfully — should appear in features
    expect(features.some(f => f.featureId === 'feat-a')).toBe(true);
  });

  it('does not fail valid renderless sketch profiles used by cutouts', async () => {
    const code = `
      const profile = path()
        .moveTo(-8, -6)
        .lineTo(8, -6)
        .threePointsArc(-8, -6, 0, 6)
        .close();
      return box(40, 30, 5).cutout(profile, { face: 'top', depth: 'through' });
    `;
    const { records } = await runScript({ code, fileName: 'cutout-profile.kcad.ts' });
    const { features, failedFeatureIds } = await meshFeaturesPerFeature(records);

    expect(failedFeatureIds).toEqual([]);
    expect(features.map((f) => f.featureKind)).toContain('box');
    expect(features.map((f) => f.featureKind)).toContain('cutout');
    expect(features.map((f) => f.featureKind)).not.toContain('sketch');
  });
});
