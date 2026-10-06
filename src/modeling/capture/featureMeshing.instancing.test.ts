// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Meshing tessellates each assembly geometry key once; pose-only edits stay
// on the pose cache; geometry edits remesh every instance. Lives in its own
// file because it wraps `meshShape` with a counting pass-through mock.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

let meshCalls = 0;
vi.mock('../../kernel/backends/occt/meshing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../kernel/backends/occt/meshing')>();
  return {
    ...actual,
    meshShape: (...args: Parameters<typeof actual.meshShape>) => {
      meshCalls += 1;
      return actual.meshShape(...args);
    },
  };
});

import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { buildModel, updateModelParams } from '../../composition/buildModel';
import { __geometryKeyComputesForTests } from '../compute/sharedLowering';
import { meshFeaturesPerFeature, type FeatureMesh } from './featureMeshing';

const ROW = `
  const w = param('w', 40);
  const gap = param('gap', 60);
  const arm = assembly('row');
  const shapes = [
    () => box(w, 20, 4).subtract(cylinder(10, 2).translate(10, 10, -1)),
    () => cylinder(30, 5),
    () => box(5, 5, 50),
  ];
  for (let i = 0; i < 30; i++) arm.part('p' + i, shapes[i % 3](), { at: [gap.multiply(i), 0, 0] });
  return arm.model();
`;

const COLORED = `
  const arm = assembly('pair');
  arm.part('red', box(10, 10, 10).color('#ff0000'), { at: [0, 0, 0] });
  arm.part('green', box(10, 10, 10).color('#00ff00'), { at: [20, 0, 0] });
  return arm.model();
`;

const partMeshes = (features: readonly FeatureMesh[]) => features.filter((f) => f.assemblyPartName !== undefined);

describe('assembly meshing with shared geometry', () => {
  beforeAll(async () => { await initOcct(); });
  beforeEach(() => { meshCalls = 0; });

  it('30 parts from 3 recipes -> 3 meshShape calls; instances share faces by reference', async () => {
    const model = await buildModel({ code: ROW, fileName: 'row.kcad.ts' });
    meshCalls = 0;
    const result = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
    expect(meshCalls).toBe(3);
    const parts = partMeshes(result.features);
    expect(parts).toHaveLength(30);
    expect(parts[3].geometryId).toBeDefined();
    expect(parts[3].geometryId).toBe(parts[0].geometryId);
    expect(parts[3].faces).toBe(parts[0].faces);
    expect(parts[1].geometryId).not.toBe(parts[0].geometryId);
    expect(parts[3].transform).not.toEqual(parts[0].transform);
  }, 120_000);

  it('a pose-only edit (gap) reuses every mesh; a geometry edit (w) remeshes the changed key once', async () => {
    const model = await buildModel({ code: ROW, fileName: 'row.kcad.ts' });
    const first = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);

    const computesBeforePose = __geometryKeyComputesForTests();
    await updateModelParams(model, [{ name: 'gap', value: 80 }]);
    meshCalls = 0;
    const moved = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
    expect(meshCalls).toBe(0);
    // P22: the pose path reuses the memoised keys (no full key recompute).
    expect(__geometryKeyComputesForTests()).toBe(computesBeforePose);
    expect(partMeshes(moved.features)[3].transform?.[12]).toBeCloseTo(240, 6);

    await updateModelParams(model, [{ name: 'w', value: 50 }]);
    meshCalls = 0;
    const resized = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
    expect(meshCalls).toBe(1);
    const resizedParts = partMeshes(resized.features);
    const oldFaces = partMeshes(first.features)[0].faces;
    expect(resizedParts[0].faces).not.toBe(oldFaces);
    expect(resizedParts[3].faces).toBe(resizedParts[0].faces);
    // Every instance of the edited key follows the edit (10 parts: 0,3,...,27).
    for (let i = 0; i < 30; i += 3) expect(resizedParts[i].faces).toBe(resizedParts[0].faces);
    expect(resizedParts[0].geometryId).not.toBe(partMeshes(first.features)[0].geometryId);
  }, 180_000);

  it('identical shapes with different colors share geometry but keep their own colors', async () => {
    const model = await buildModel({ code: COLORED, fileName: 'pair.kcad.ts' });
    meshCalls = 0;
    const result = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
    expect(meshCalls).toBe(1);
    const [red, green] = partMeshes(result.features);
    expect(red.geometryId).toBeDefined();
    expect(green.geometryId).toBe(red.geometryId);
    expect(green.faces).toBe(red.faces);
    expect(red.color).toBe('#ff0000');
    expect(green.color).toBe('#00ff00');
  }, 120_000);
});
