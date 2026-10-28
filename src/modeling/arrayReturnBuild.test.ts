// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { isSceneBackend } from '../kernel/backends/sceneBackend';
import { initOcct } from '../kernel/backends/occt/occtBackend';
import { buildModel } from '../composition/buildModel';
import { meshFeaturesPerFeature } from './capture/featureMeshing';
import { KernelError } from '../shared/intent/kernelError';
import { Scene } from './validation/scene';

beforeAll(async () => { await initOcct(); }, 60_000);

describe('array return values', () => {
  it('keeps every returned Shape in a multi-part Scene', async () => {
    const model = await buildModel({
      code: `const bracket = box(20, 10, 3);\nconst pin = cylinder(12, 2).translate(25, 0, 0);\nreturn [bracket, pin];`,
      fileName: 'array-return.kcad.ts',
    });

    expect(model.returnValue instanceof Scene).toBe(true);
    expect(model.rootId).toBe(model.returnValue.__sourceFeatureId());
    expect(isSceneBackend(model.rootShape)).toBe(true);
    if (!isSceneBackend(model.rootShape)) throw new Error('Expected an array-return SceneBackend');
    expect(model.rootShape.parts.map(part => part.name)).toEqual(['bracket', 'pin']);
    const partsByName = new Map(model.rootShape.parts.map(part => [part.name, part]));
    expect(partsByName.get('bracket')?.shape.volume()).toBeCloseTo(600, 5);
    expect(partsByName.get('pin')?.shape.volume()).toBeCloseTo(48 * Math.PI, 2);
    const bracketBounds = partsByName.get('bracket')!.shape.boundingBox();
    const pinBounds = partsByName.get('pin')!.shape.boundingBox();
    [20, 10, 3].forEach((size, axis) => {
      expect(bracketBounds.max[axis] - bracketBounds.min[axis]).toBeCloseTo(size, 5);
    });
    [4, 4, 12].forEach((size, axis) => {
      expect(pinBounds.max[axis] - pinBounds.min[axis]).toBeCloseTo(size, 3);
    });

    const meshing = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
    expect(meshing.failedFeatureIds).toEqual([]);
    expect(meshing.features
      .filter(feature => feature.assemblyFeatureId === model.rootId)
      .map(feature => feature.assemblyPartName)
      .sort()).toEqual(['bracket', 'pin']);
  }, 60_000);

  it('rejects arrays that mix Shapes with non-Shape values', async () => {
    const error = await buildModel({
      code: `const bracket = box(20, 10, 3);\nreturn [bracket, 42];`,
      fileName: 'mixed-array-return.kcad.ts',
    }).then(() => undefined, (reason: unknown) => reason);
    expect(error instanceof KernelError).toBe(true);
    expect((error as KernelError).code).toBe('feature.invalid-args');
    expect((error as KernelError).message).toMatch(/array return.*non-Shape.*index 1/i);
  });

  it('keeps direct Shape and Scene returns on their existing paths', async () => {
    const shapeModel = await buildModel({ code: 'return box(20, 10, 3);', fileName: 'shape-return.kcad.ts' });
    expect(shapeModel.returnValue).toHaveProperty('id');
    expect(shapeModel.rootId).toBe((shapeModel.returnValue as { id: string }).id);

    const sceneModel = await buildModel({
      code: `const arm = assembly('existing');\narm.part('body', box(20, 10, 3));\nreturn arm.model();`,
      fileName: 'scene-return.kcad.ts',
    });
    expect(sceneModel.returnValue).toBeInstanceOf(Scene);
    expect(sceneModel.rootId).toBe(sceneModel.returnValue.__sourceFeatureId());
  }, 60_000);
});
