// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it } from 'vitest';

describe('TriangleBvh closest pair', () => {
  it('finds the exact distance and witness points for separated triangles', async () => {
    const { TriangleBvh } = await import('./meshBvh');
    const a = new TriangleBvh({
      vertices: [0, 0, 0, 10, 0, 0, 0, 10, 0],
      triangles: [0, 1, 2],
    });
    const b = new TriangleBvh({
      vertices: [0, 0, 3, 10, 0, 3, 0, 10, 3],
      triangles: [0, 1, 2],
    });

    const closest = a.closestPoints(b);
    expect(closest?.distance).toBeCloseTo(3, 8);
    expect(closest?.pointA[2]).toBeCloseTo(0, 8);
    expect(closest?.pointB[2]).toBeCloseTo(3, 8);
  });

  it('returns zero distance when two triangle interiors cross', async () => {
    const { TriangleBvh } = await import('./meshBvh');
    const a = new TriangleBvh({
      vertices: [-2, -2, 0, 2, -2, 0, 0, 2, 0],
      triangles: [0, 1, 2],
    });
    const b = new TriangleBvh({
      vertices: [0, -1, -1, 0, 1, -1, 0, 0, 1],
      triangles: [0, 1, 2],
    });

    expect(a.closestPoints(b)?.distance).toBe(0);
  });

  it('detects crossings at small coordinate scales', async () => {
    const { TriangleBvh } = await import('./meshBvh');
    const scale = 2e-6;
    const a = new TriangleBvh({
      vertices: [-2, -2, 0, 2, -2, 0, 0, 2, 0].map((value) => value * scale),
      triangles: [0, 1, 2],
    });
    const b = new TriangleBvh({
      vertices: [0, -1, -1, 0, 1, -1, 0, 0, 1].map((value) => value * scale),
      triangles: [0, 1, 2],
    });

    expect(a.closestPoints(b)?.distance).toBe(0);
  });
});
