// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';
import { buildEdgePolylines, buildVisibleEdgePolylines, rangePoints } from './edgePolylines';

/** Segment-pair vertices (a,b,b,c,...) of a polyline, as the viewer draws edges. */
const pairs = (pts: number[][]): number[] =>
  pts.slice(0, -1).flatMap((p, i) => [...p, ...pts[i + 1]]);

describe('rangePoints', () => {
  it('reads vertex pairs as one ordered polyline', () => {
    const e = new Float32Array(pairs([[0, 0, 0], [1, 0, 0], [1, 1, 0]]));
    expect(rangePoints(e, 0, 4)).toEqual([[0, 0, 0], [1, 0, 0], [1, 1, 0]]);
  });
  it('reads a plain polyline range unchanged', () => {
    const e = new Float32Array([0, 0, 0, 1, 0, 0, 5, 5, 5]);
    expect(rangePoints(e, 0, 3)).toHaveLength(3);
  });
});

describe('buildEdgePolylines', () => {
  const square = [[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0], [0, 0, 0]];
  const geo = (extra: Partial<GeometryResult> = {}): GeometryResult => ({
    faces: [],
    edges: new Float32Array(pairs(square)),
    edgeRanges: [0, 8],
    ...extra,
  });

  it('finds closed edges and their 90 degree corners', () => {
    const [pl] = buildEdgePolylines([geo()]);
    expect(pl.closed).toBe(true);
    expect(pl.corners.sort()).toEqual([0, 1, 2, 3]);
    expect(pl.circle).toBeNull();
  });
  it('keeps the mesh-local edge reference and owning feature with each polyline', () => {
    const [pl] = buildEdgePolylines([geo({ featureId: 'base', edgeOwners: ['fillet'] })]);
    expect(pl.ref).toEqual({ shapeIndex: 0, kind: 'edge', id: 0, featureId: 'fillet' });
  });
  it('applies the per-part transform (translate +100 in x)', () => {
    const t = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 100, 0, 0, 1];
    const [pl] = buildEdgePolylines([geo({ transform: t })]);
    expect(Array.from(pl.pts.slice(0, 3))).toEqual([100, 0, 0]);
  });
  it('detects a circular edge', () => {
    const ring = Array.from({ length: 33 }, (_, i) => [5 * Math.cos((i / 32) * 2 * Math.PI), 5 * Math.sin((i / 32) * 2 * Math.PI), 0]);
    const [pl] = buildEdgePolylines([geo({ edges: new Float32Array(pairs(ring)), edgeRanges: [0, 64] })]);
    expect(pl.circle?.radius).toBeCloseTo(5, 4);
    expect(pl.corners).toEqual([0]);
  });
  it('skips geometry without edge ranges', () => {
    expect(buildEdgePolylines([geo({ edgeRanges: undefined })])).toEqual([]);
  });
  it('preserves original topology indices when a hidden part is filtered out', () => {
    const visible = buildVisibleEdgePolylines([geo(), geo()], ['hidden', 'visible'], ['hidden']);
    expect(visible.map((edge) => edge.ref)).toEqual([{ shapeIndex: 1, kind: 'edge', id: 0 }]);
  });
});
