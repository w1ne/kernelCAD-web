// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A circular pattern is a rotation about an axis LINE, not only about the world
// origin. This fixture puts four lugs on a 30 mm bolt circle around a flange
// centre at (40, 25), which is the common mechanical-CAD case. Before `pivot`,
// the copies rotated about (0, 0) and left the flange.

import { beforeAll, describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { isTopologicallyValid } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { createModelingApi } from '../../../src/modeling/api';

const FLANGE_CENTRE: [number, number, number] = [40, 25, 0];

async function lower(build: (kcad: ReturnType<typeof createModelingApi>) => void) {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  build(kcad);
  const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());
  return { session, result };
}

function wrapped(shape: { getReplicadShape(): { wrapped: unknown } }): unknown {
  return shape.getReplicadShape().wrapped;
}

describe('circular pattern pivot', () => {
  beforeAll(async () => { await initOcct(); });

  it('places four lugs on a bolt circle about the flange centre', async () => {
    const { result } = await lower((kcad) => {
      const lug = kcad.box(10, 10, 10).translate(65, 20, 0);
      lug.patternCircular({ count: 4, axis: 'Z', pivot: FLANGE_CENTRE });
    });

    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const pattern = result.shapes.get('pattern_1');
    expect(pattern).toBeDefined();
    if (!pattern) throw new Error('pattern did not lower');

    expect(isTopologicallyValid(wrapped(pattern))).toBe(true);
    // Four disjoint 10 x 10 x 10 lugs: one at the source, then +90/+180/+270
    // degrees about (40, 25). The union spans the full cross.
    expect(pattern.volume()).toBeCloseTo(4_000, 6);
    expect(pattern.boundingBox().min[0]).toBeCloseTo(5, 6);
    expect(pattern.boundingBox().min[1]).toBeCloseTo(-10, 6);
    expect(pattern.boundingBox().min[2]).toBeCloseTo(0, 6);
    expect(pattern.boundingBox().max[0]).toBeCloseTo(75, 6);
    expect(pattern.boundingBox().max[1]).toBeCloseTo(60, 6);
    expect(pattern.boundingBox().max[2]).toBeCloseTo(10, 6);
  }, 120_000);

  it('keeps the world-origin behaviour when pivot is omitted', async () => {
    const { result } = await lower((kcad) => {
      const lug = kcad.box(10, 10, 10).translate(6, 0, 0);
      lug.patternCircular({ count: 4, axis: 'Z' });
    });

    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const pattern = result.shapes.get('pattern_1');
    if (!pattern) throw new Error('pattern did not lower');
    // Source spans x 6..16, y 0..10. Four 90-degree turns about (0, 0) put the
    // cross at x -16..16, y -16..16.
    expect(pattern.volume()).toBeCloseTo(4_000, 6);
    expect(pattern.boundingBox().min[0]).toBeCloseTo(-16, 6);
    expect(pattern.boundingBox().min[1]).toBeCloseTo(-16, 6);
    expect(pattern.boundingBox().max[0]).toBeCloseTo(16, 6);
    expect(pattern.boundingBox().max[1]).toBeCloseTo(16, 6);
  }, 120_000);

  it('accepts a pivot point anywhere on the axis line', async () => {
    const { result } = await lower((kcad) => {
      const lug = kcad.box(10, 10, 10).translate(65, 20, 0);
      lug.patternCircular({ count: 4, axis: 'Z', pivot: [40, 25, 500] });
    });

    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const pattern = result.shapes.get('pattern_1');
    if (!pattern) throw new Error('pattern did not lower');
    // A Z-axis through (40, 25, 500) is the same line as through (40, 25, 0).
    expect(pattern.boundingBox().min[0]).toBeCloseTo(5, 6);
    expect(pattern.boundingBox().max[0]).toBeCloseTo(75, 6);
    expect(pattern.boundingBox().min[1]).toBeCloseTo(-10, 6);
    expect(pattern.boundingBox().max[1]).toBeCloseTo(60, 6);
  }, 120_000);

  it('records the pivot on the pattern feature', () => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const lug = kcad.box(10, 10, 10).translate(65, 20, 0);
    lug.patternCircular({ count: 4, axis: [0, 0, 1], pivot: FLANGE_CENTRE });

    const record = session.getRecords().at(-1);
    expect(record).toMatchObject({
      kind: 'pattern',
      metadata: {
        pattern: {
          kind: 'circular',
          count: 4,
          axis: [0, 0, 1],
          angleDeg: 360,
          pivot: FLANGE_CENTRE,
        },
      },
    });
  });

  it('rejects a malformed pivot with a corrective invalid-args message', () => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const lug = kcad.box(10, 10, 10);

    expect(() => lug.patternCircular({ count: 4, axis: 'Z', pivot: [1, 2] as never }))
      .toThrow(/patternCircular\(\{ pivot \}\).*opts\.pivot/);
    expect(() => lug.patternCircular({ count: 4, axis: 'Z', pivot: [1, 2, Number.NaN] }))
      .toThrow(/patternCircular\(\{ pivot \}\).*opts\.pivot/);
  });
});
