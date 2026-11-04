// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { isSceneBackend } from '../../../kernel/backends/sceneBackend';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import type { ShapeBackend } from '../../../kernel/backends/backend';
import { buildModel, type BuiltModel } from '../../buildModel';
import { KernelError } from '../../../shared/intent/kernelError';
import { Scene } from '../../validation/scene';

beforeAll(async () => { await initOcct(); }, 60_000);

function errorsOf(model: BuiltModel) {
  return model.diagnostics.filter((d) => d.severity === 'error');
}

function sceneParts(model: BuiltModel) {
  expect(errorsOf(model)).toEqual([]);
  expect(isSceneBackend(model.rootShape)).toBe(true);
  if (!isSceneBackend(model.rootShape)) throw new Error('expected a split SceneBackend');
  return model.rootShape.parts;
}

function sizes(shape: ShapeBackend): [number, number, number] {
  const box = shape.boundingBox();
  return [0, 1, 2].map((axis) => box.max[axis] - box.min[axis]) as [number, number, number];
}

describe('shape.split keeps leftover solids', () => {
  it('returns intersection, a_only, and b_only for overlapping boxes', async () => {
    const model = await buildModel({
      fileName: 'split-overlap.kcad.ts',
      code: 'return box(20, 20, 20).split(box(20, 20, 20).translate(10, 0, 0));',
    });
    expect(model.returnValue).toBeInstanceOf(Scene);
    expect((model.returnValue as Scene).part('a_only').name).toBe('a_only');
    const parts = sceneParts(model);
    expect(parts.map((part) => part.name)).toEqual(['intersection', 'a_only', 'b_only']);
    for (const part of parts) {
      expect(part.shape.volume()).toBeCloseTo(4000, 0);
      const [x, y, z] = sizes(part.shape);
      expect(x).toBeCloseTo(10, 1);
      expect(y).toBeCloseTo(20, 1);
      expect(z).toBeCloseTo(20, 1);
    }
  }, 60_000);

  it('omits the empty intersection when the operands do not overlap', async () => {
    const model = await buildModel({
      fileName: 'split-disjoint.kcad.ts',
      code: 'return box(10, 10, 10).split(box(10, 10, 10).translate(30, 0, 0));',
    });
    const parts = sceneParts(model);
    expect(parts.map((part) => part.name)).toEqual(['a_only', 'b_only']);
    expect(parts[0].shape.volume()).toBeCloseTo(1000, 0);
    expect(parts[1].shape.volume()).toBeCloseTo(1000, 0);
  }, 60_000);

  it('returns one Shape when keep is intersection', async () => {
    const model = await buildModel({
      fileName: 'split-keep-intersection.kcad.ts',
      code: "return box(20, 20, 20).split(box(20, 20, 20).translate(10, 0, 0), { keep: 'intersection' });",
    });
    expect(errorsOf(model)).toEqual([]);
    expect(model.returnValue).not.toBeInstanceOf(Scene);
    expect(isSceneBackend(model.rootShape)).toBe(false);
    expect(model.rootShape?.volume()).toBeCloseTo(4000, 0);
  }, 60_000);

  it('leaves subtract and intersect as one Shape', async () => {
    const cut = await buildModel({
      fileName: 'split-subtract-unchanged.kcad.ts',
      code: 'return box(20, 20, 20).subtract(box(20, 20, 20).translate(10, 0, 0));',
    });
    const common = await buildModel({
      fileName: 'split-intersect-unchanged.kcad.ts',
      code: 'return box(20, 20, 20).intersect(box(20, 20, 20).translate(10, 0, 0));',
    });
    expect(errorsOf(cut)).toEqual([]);
    expect(errorsOf(common)).toEqual([]);
    expect(isSceneBackend(cut.rootShape)).toBe(false);
    expect(isSceneBackend(common.rootShape)).toBe(false);
    expect(cut.rootShape?.volume()).toBeCloseTo(4000, 0);
    expect(common.rootShape?.volume()).toBeCloseTo(4000, 0);
  }, 60_000);

  it('errors when the requested fragment is empty', async () => {
    const model = await buildModel({
      fileName: 'split-empty-intersection.kcad.ts',
      code: "return box(10, 10, 10).split(box(10, 10, 10).translate(30, 0, 0), { keep: 'intersection' });",
    });
    expect(errorsOf(model).map((d) => d.code)).toContain('feature.intersection-empty');
    expect(model.rootShape).toBeUndefined();
  }, 60_000);

  it('rejects an unknown keep', async () => {
    const error = await buildModel({
      fileName: 'split-bad-keep.kcad.ts',
      code: "return box(10, 10, 10).split(box(10, 10, 10), { keep: 'both' });",
    }).then(() => undefined, (reason: unknown) => reason);
    expect(error).toBeInstanceOf(KernelError);
    expect((error as KernelError).code).toBe('feature.invalid-args');
    expect((error as KernelError).message).toMatch(/opts\.keep/);
  });
});
