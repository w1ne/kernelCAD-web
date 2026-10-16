// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/assemblies/solvedModelDefaultPose.test.ts
//
// `arm.solvedModel()` with no poses argument used to crash deep in the pose
// walk with a bare TypeError ("Cannot convert undefined or null to
// object"). Omitted / undefined / null poses now mean the default pose (the
// same as `{}`); a non-object is a coded invalid-args error.

import { beforeAll, describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import type { Poses } from '../../../src/modeling/capture/assemblyTypes';

function hinge() {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly('hinge');
  arm.part('base', kcad.box(20, 20, 5))
    .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [10, 10, 5] }, axis: [0, 0, 1] });
  arm.part('lid', kcad.box(20, 20, 5).translate(0, 0, 5))
    .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [10, 10, 5] }, axis: [0, 0, 1] });
  arm.mate('hinge', 'base.axis', 'lid.axis', 'revolute', { limitsDeg: [-90, 90] });
  return arm;
}

describe('Assembly.solvedModel() default pose', () => {
  beforeAll(async () => { await initOcct(); });

  it('no argument solves at the default pose, like {}', async () => {
    const scene = await hinge().solvedModel();
    const reference = await hinge().solvedModel({});
    expect(scene.parts.map((p) => p.name)).toEqual(['base', 'lid']);
    expect(scene.parts.map((p) => p.worldTransform.toMat4()))
      .toEqual(reference.parts.map((p) => p.worldTransform.toMat4()));
  });

  it('undefined / null poses with options still work', async () => {
    await expect(hinge().solvedModel(undefined, { validate: 'off' })).resolves.toBeDefined();
    await expect(hinge().solvedModel(null as unknown as Poses, { validate: 'off' })).resolves.toBeDefined();
  });

  it('a non-object poses argument is a coded invalid-args error', () => {
    expect(() => hinge().solvedModel(30 as unknown as Poses)).toThrow(/assembly\.solvedModel\(poses\?, opts\?\)/);
    try {
      void hinge().solvedModel([30] as unknown as Poses);
      throw new Error('expected a throw');
    } catch (e) {
      expect((e as { code?: string }).code).toBe('feature.invalid-args');
      expect(`${(e as Error).message} ${(e as { hint?: string }).hint}`).toMatch(/arm\.solvedModel\(\{ hinge: 30 \}\)/);
    }
  });
});
