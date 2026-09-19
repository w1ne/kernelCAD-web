// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/reconstruct/analysis.test.ts
//
// Characterisation of analyseMesh before the complexity split: pins the box
// and blob analyses end to end (levels, bands, unmatched regions).

import { describe, expect, it } from 'vitest';
import { analyseMesh } from '../../../src/agent/reconstruct/analysis';
import { blobSoup, boxSoup } from './testMeshes';

describe('analyseMesh', () => {
  it('pins the box analysis end to end', () => {
    const a = analyseMesh(boxSoup(80, 50, 6));
    expect(a.report.vertices).toBe(8);
    expect(a.frame.axis).toEqual([0, 0, 1]);
    expect(a.zMin).toBe(0);
    expect(a.zMax).toBe(6);
    expect(a.levels).toEqual([0, 6]);
    expect(a.bands).toHaveLength(1);
    expect([a.bands[0].z0, a.bands[0].z1]).toEqual([0, 6]);
    expect(a.bands[0].section.materialArea).toBeCloseTo(4000, 9);
    expect(a.bands[0].sampledAreas).toEqual([4000, 4000, 4000, 4000, 4000]);
    expect(a.crossBores).toHaveLength(0);
    expect(a.unmatched).toHaveLength(0);
    expect(a.diagonal).toBeCloseTo(Math.hypot(80, 50, 6), 9);
    expect(a.unmatchedAreaThresholdMm2).toBeCloseTo(0.002 * a.seg.totalArea, 9);
  });

  it('pins the blob analysis: freeform-only, levels at the z extremes', () => {
    const a = analyseMesh(blobSoup());
    expect(a.seg.planes).toHaveLength(0);
    expect(a.seg.cylinders).toHaveLength(0);
    expect(a.levels).toEqual([a.zMin, a.zMax]);
    expect(a.bands).toHaveLength(1);
    expect(a.crossBores).toHaveLength(0);
    expect(a.unmatched).toHaveLength(1);
    expect(a.unmatched[0].kind).toBe('freeform');
    expect(a.unmatched[0].reason).toBe('Surface matched neither a plane nor a cylinder within tolerance.');
    expect(a.unmatched[0].triangleCount).toBe(2208);
  });
});
