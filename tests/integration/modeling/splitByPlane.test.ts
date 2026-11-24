// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Split one solid by an infinite plane into the material on each side.
// The box cutter that implements the half-space is an internal detail: both
// halves must carry the exact plane as their cut face, keep their volume and
// stay one valid B-rep solid.
import { beforeAll, describe, expect, it } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../../src/kernel/backends/occt/booleanRecovery';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { KernelError } from '../../../src/shared/intent/kernelError';

function block() {
  const session = new CaptureSession();
  session.setEngine(new RecomputeEngine(createOcctLowerer(session)));
  const api = createModelingApi({ session });
  return { api, session };
}

function wrapped(shape: OcctBackend): unknown {
  return (shape.getReplicadShape() as unknown as { wrapped: unknown }).wrapped;
}

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('Shape.splitByPlane', () => {
  it('splits a plate into exact positive and negative volumes', async () => {
    const { api } = block();
    const [positive, negative] = api.box(40, 30, 20).splitByPlane([0, 0, 1], 8);
    const [upper, lower] = await Promise.all([positive.lower(), negative.lower()]);

    // Positive side: z = 8..20 (12 mm); negative side: z = 0..8 (8 mm).
    expect(upper.volume()).toBeCloseTo(40 * 30 * 12, 6);
    expect(lower.volume()).toBeCloseTo(40 * 30 * 8, 6);
    expect(upper.volume() + lower.volume()).toBeCloseTo(40 * 30 * 20, 6);

    const ub = upper.boundingBox();
    const lb = lower.boundingBox();
    expect(ub.min[2]).toBeCloseTo(8, 6);
    expect(ub.max[2]).toBeCloseTo(20, 6);
    expect(lb.min[2]).toBeCloseTo(0, 6);
    expect(lb.max[2]).toBeCloseTo(8, 6);

    for (const half of [upper, lower]) {
      expect(isValidShape(getOC(), wrapped(half))).toBe(true);
      expect(half.solidComponents()).toHaveLength(1);
      expect(half.isEmpty()).toBe(false);
    }
  });

  it('cuts the exact diagonal section of a cube', async () => {
    const { api } = block();
    const [positive, negative] = api.box(20, 20, 20).splitByPlane([1, 1, 0], 20);
    const [a, b] = await Promise.all([positive.lower(), negative.lower()]);

    // Plane x + y = 20 passes through two opposite vertical edges and divides
    // the cube into two equal triangular prisms of 4000 mm³.
    expect(a.volume()).toBeCloseTo(4000, 5);
    expect(b.volume()).toBeCloseTo(4000, 5);
    expect(a.volume() + b.volume()).toBeCloseTo(8000, 5);

    // The new face is a 20 x 20*sqrt(2) rectangle on each half. Sum of surface
    // areas = original cube area + both cut faces.
    expect(a.surfaceArea() + b.surfaceArea()).toBeCloseTo(
      6 * 20 * 20 + 2 * 20 * 20 * Math.SQRT2,
      3,
    );

    for (const half of [a, b]) {
      expect(isValidShape(getOC(), wrapped(half))).toBe(true);
      expect(half.solidComponents()).toHaveLength(1);
    }
  });

  it('accepts a numeric param() offset', async () => {
    const { api } = block();
    const cut = api.param('cutHeight', 8);
    const [positive, negative] = api.box(40, 30, 20).splitByPlane([0, 0, 1], cut);
    const [upper, lower] = await Promise.all([positive.lower(), negative.lower()]);

    expect(upper.volume()).toBeCloseTo(40 * 30 * 12, 6);
    expect(lower.volume()).toBeCloseTo(40 * 30 * 8, 6);
  });

  it('rejects a zero normal at capture time', () => {
    const { api } = block();
    const before = api.box(40, 30, 20);
    let caught: unknown;
    try {
      before.splitByPlane([0, 0, 0], 8);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(KernelError);
    expect((caught as KernelError).code).toBe('feature.invalid-args');
  });

  it('normalizes the normal and honors a negative direction', async () => {
    const { api } = block();
    // Same plane z = 2, measured from the opposite normal.
    const [positive, negative] = api.box(40, 30, 20).splitByPlane([0, 0, -3], -6);
    const [below, above] = await Promise.all([positive.lower(), negative.lower()]);

    expect(below.volume()).toBeCloseTo(40 * 30 * 2, 6);
    expect(above.volume()).toBeCloseTo(40 * 30 * 18, 6);
    expect(below.boundingBox().max[2]).toBeCloseTo(2, 6);
    expect(above.boundingBox().min[2]).toBeCloseTo(2, 6);
  });
});
