// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
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
    expect((error as KernelError).message).toMatch(
      /\.kcad\.ts script return value: return value — got mixed array: Shape indexes 0; non-Shape entries \(index 1: number\); requires each element of a multi-body array return to be a Shape\. Example: return \[partA, partB\];/i,
    );
  });

  it('keeps every Shape of a returned object map as a part named by its key (#1799)', async () => {
    const model = await buildModel({
      code: `const plate = box(20, 10, 3);\nconst pin = cylinder(12, 2).translate(25, 0, 0);\n` +
        `const arm = assembly('declared');\narm.part('plate', plate);\n` +
        `return { motor_plate: plate, drive_pinion: pin };`,
      fileName: 'object-return.kcad.ts',
    });

    expect(model.returnValue).toBeInstanceOf(Scene);
    expect(model.rootId).toBe((model.returnValue as Scene).__sourceFeatureId());
    if (!isSceneBackend(model.rootShape)) throw new Error('Expected an object-return SceneBackend');
    expect(model.rootShape.parts.map(part => part.name)).toEqual(['motor_plate', 'drive_pinion']);
    const partsByName = new Map(model.rootShape.parts.map(part => [part.name, part]));
    expect(partsByName.get('motor_plate')?.shape.volume()).toBeCloseTo(600, 5);
    expect(partsByName.get('drive_pinion')?.shape.volume()).toBeCloseTo(48 * Math.PI, 2);

    const meshing = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
    expect(meshing.failedFeatureIds).toEqual([]);
    expect(meshing.features
      .filter(feature => feature.assemblyFeatureId === model.rootId)
      .map(feature => feature.assemblyPartName)
      .sort()).toEqual(['drive_pinion', 'motor_plate']);
    expect(meshing.bounds.max[0] - meshing.bounds.min[0]).toBeCloseTo(27, 3);
    expect(meshing.bounds.max[2] - meshing.bounds.min[2]).toBeCloseTo(12, 3);
  }, 60_000);

  it('rejects object maps that mix Shapes with non-Shape values', async () => {
    const error = await buildModel({
      code: `const bracket = box(20, 10, 3);\nreturn { bracket, count: 42 };`,
      fileName: 'mixed-object-return.kcad.ts',
    }).then(() => undefined, (reason: unknown) => reason);
    expect(error instanceof KernelError).toBe(true);
    expect((error as KernelError).code).toBe('feature.invalid-args');
    expect((error as KernelError).message).toMatch(
      /got mixed object: Shape keys bracket; non-Shape entries \(count: number\); requires each value of a multi-body object return to be a Shape/i,
    );
  });

  it('leaves plain-data object returns without Shapes on the tail path', async () => {
    const model = await buildModel({ code: 'box(20, 10, 3);\nreturn { note: 1 };', fileName: 'data-return.kcad.ts' });
    expect(model.returnValue).toEqual({ note: 1 });
    expect(model.rootId).toBe(model.tailId);
  }, 60_000);

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

  it('builds and meshes the official fluent color-enclosure example', async () => {
    const code = await readFile('examples/params/color-enclosure.kcad.ts', 'utf8');
    const model = await buildModel({ code, fileName: 'examples/params/color-enclosure.kcad.ts' });

    expect(model.returnValue).toBeInstanceOf(Scene);
    expect(isSceneBackend(model.rootShape)).toBe(true);
    if (!isSceneBackend(model.rootShape)) throw new Error('Expected an enclosure SceneBackend');
    expect(model.rootShape.parts.map(part => part.name)).toEqual(['base', 'lid']);

    const meshing = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
    expect(meshing.failedFeatureIds).toEqual([]);
    expect(meshing.features
      .filter(feature => feature.assemblyFeatureId === model.rootId)
      .map(feature => feature.assemblyPartName)
      .sort()).toEqual(['base', 'lid']);
    expect(meshing.bounds.max[0] - meshing.bounds.min[0]).toBeCloseTo(60, 4);
    expect(meshing.bounds.max[1] - meshing.bounds.min[1]).toBeCloseTo(40, 4);
    expect(meshing.bounds.max[2] - meshing.bounds.min[2]).toBeCloseTo(21, 4);
  }, 60_000);
});
