// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The ShapeBackend plane split used to throw `not implemented in v0.1`.
// This pins the backend half of the contract independently of the feature
// lowerer so a future refactor cannot leave the interface lying again.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { getOC } from 'replicad';
import { isValidShape } from '../../../../src/kernel/backends/occt/booleanRecovery';

function wrapped(shape: OcctBackend): unknown {
  return (shape.getReplicadShape() as unknown as { wrapped: unknown }).wrapped;
}

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('OcctBackend.splitByPlane', () => {
  it('returns the two solid halves on the requested sides', () => {
    const [positive, negative] = OcctBackend.box(40, 30, 20)
      .splitByPlane([0, 0, 1], 8) as [OcctBackend, OcctBackend];

    expect(positive.volume()).toBeCloseTo(40 * 30 * 12, 6);
    expect(negative.volume()).toBeCloseTo(40 * 30 * 8, 6);
    expect(positive.boundingBox().min[2]).toBeCloseTo(8, 6);
    expect(negative.boundingBox().max[2]).toBeCloseTo(8, 6);
    expect(isValidShape(getOC(), wrapped(positive))).toBe(true);
    expect(isValidShape(getOC(), wrapped(negative))).toBe(true);
    expect(positive.solidComponents()).toHaveLength(1);
    expect(negative.solidComponents()).toHaveLength(1);
  });
});
