// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Regression for a straight centerline rib fused to a rectangular base.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { isTopologicallyValid } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { buildModel } from '../../../src/modeling/buildModel';

describe('rib geometry', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('adds a centered 2 mm rib to a 40 × 30 × 10 base with valid, measured B-rep geometry', async () => {
    const model = await buildModel({
      fileName: 'rib-regression.kcad.ts',
      code: `
        const base = box(40, 30, 10);
        return rib(base, [[5, 15], [35, 15]], {
          thickness: 2,
          height: 20,
          startZ: 9.9,
        });
      `,
    });

    expect(model.diagnostics.filter((d) => d.severity === 'error'), JSON.stringify(model.diagnostics)).toEqual([]);
    expect(model.tailShape).toBeDefined();
    const shape = model.tailShape!;
    const wrapped = (shape as unknown as { getReplicadShape(): { wrapped: unknown } }).getReplicadShape().wrapped;

    expect(isTopologicallyValid(wrapped)).toBe(true);
    // Base volume 12,000 + rib volume 1,200 − 6 mm³ of the deliberate 0.1 mm overlap.
    expect(shape.volume()).toBeCloseTo(13_194, 0);
    expect(shape.boundingBox().min).toEqual([0, 0, 0]);
    expect(shape.boundingBox().max[0]).toBeCloseTo(40, 6);
    expect(shape.boundingBox().max[1]).toBeCloseTo(30, 6);
    expect(shape.boundingBox().max[2]).toBeCloseTo(29.9, 6);
  }, 120_000);
});
