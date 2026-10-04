// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { EdgePolyline } from './edgePolylines';
import { computeSnap, type Projected } from './measureSnap';
import type { Vec3 } from './measureMath';

// Orthographic-style test camera: pixel = (x*10, y*10), depth = z.
const project = (p: Vec3): Projected => ({ x: p[0] * 10, y: p[1] * 10, depth: p[2] });

const line: EdgePolyline = {
  pts: new Float32Array([0, 0, 5, 10, 0, 5, 10, 10, 5]),
  closed: false,
  corners: [0, 1, 2],
  circle: null,
};

const base = { polylines: [line], project, face: { point: [3, 1, 5] as Vec3, distance: 5 } };

describe('computeSnap', () => {
  it('prefers a corner over the edge and the face', () => {
    const hit = computeSnap({ ...base, cursor: { x: 98, y: 3 } });
    expect(hit).toMatchObject({ kind: 'vertex', point: [10, 0, 5], polyline: 0 });
  });
  it('snaps to the nearest point on an edge away from corners', () => {
    const hit = computeSnap({ ...base, cursor: { x: 40, y: 4 } });
    expect(hit?.kind).toBe('edge');
    expect(hit?.point[0]).toBeCloseTo(4, 5);
    expect(hit?.point[1]).toBeCloseTo(0, 5);
  });
  it('falls back to the face point when no edge is near', () => {
    const hit = computeSnap({ ...base, cursor: { x: 30, y: 60 } });
    expect(hit).toEqual({ kind: 'face', point: [3, 1, 5] });
  });
  it('ignores edges hidden behind the face under the cursor', () => {
    const hit = computeSnap({ ...base, face: { point: [3, 1, 2], distance: 2 }, cursor: { x: 100, y: 2 } });
    expect(hit?.kind).toBe('face');
  });
  it('returns null over empty space', () => {
    expect(computeSnap({ polylines: [line], project, face: null, cursor: { x: 500, y: 500 } })).toBeNull();
  });
  it('skips points behind the camera', () => {
    const hit = computeSnap({ ...base, project: () => null, face: null, cursor: { x: 0, y: 0 } });
    expect(hit).toBeNull();
  });
});
