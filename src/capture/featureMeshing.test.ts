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
});
