// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Pure-geometry unit tests for the surface-deviation core. No OCCT: meshes
// are hand-built so the expected distances are closed-form.

import { describe, it, expect } from 'vitest';
import {
  meshDeviation,
  pointTriangleDistanceSq,
  MAX_SAMPLES_PER_SIDE,
} from './meshDeviation';
import type { RuntimeMesh } from '../../kernel/backends/runtimeMesh';

function mesh(positions: number[], indices: number[]): RuntimeMesh {
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(positions.length),
    indices: new Uint32Array(indices),
  };
}

/** Unit square in the z = h plane, as two triangles. */
function quadAtHeight(h: number): RuntimeMesh {
  return mesh(
    [0, 0, h, 1, 0, h, 1, 1, h, 0, 1, h],
    [0, 1, 2, 0, 2, 3],
  );
}

describe('pointTriangleDistanceSq', () => {
  const tri = [0, 0, 0, 1, 0, 0, 0, 1, 0] as const;

  it('is zero for a point on the triangle', () => {
    expect(pointTriangleDistanceSq(0.25, 0.25, 0, ...tri)).toBeCloseTo(0, 12);
  });

  it('measures perpendicular distance above the face interior', () => {
    expect(pointTriangleDistanceSq(0.25, 0.25, 3, ...tri)).toBeCloseTo(9, 12);
  });

  it('measures distance to the nearest vertex outside the corner region', () => {
    // (-1, -1, 0) is closest to vertex (0,0,0): sqrt(2).
    expect(pointTriangleDistanceSq(-1, -1, 0, ...tri)).toBeCloseTo(2, 12);
  });

  it('measures distance to the nearest edge outside an edge region', () => {
    // (0.5, -2, 0) projects onto the a→b edge at (0.5, 0, 0): 2.
    expect(pointTriangleDistanceSq(0.5, -2, 0, ...tri)).toBeCloseTo(4, 12);
  });
});

describe('meshDeviation', () => {
  it('is zero between a mesh and itself', () => {
    const q = quadAtHeight(0);
    const r = meshDeviation(q, q);
    expect(r.maxDeviationMm).toBeCloseTo(0, 12);
    expect(r.meanDeviationMm).toBeCloseTo(0, 12);
    expect(r.subsampled).toBe(false);
    // 4 vertices + 2 triangle centroids, both directions.
    expect(r.samples).toBe(12);
  });

  it('sees an interior-face displacement that vertex-only sampling would miss', () => {
    // Both meshes share all four corner vertices; only the interior differs —
    // A dips into a V, B is flat. Every vertex of A lies ON B, so a
    // vertex-only Hausdorff reads 0. Centroid sampling finds the dip.
    const flat = quadAtHeight(0);
    const dipped = mesh(
      [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0.5, 0.5, -1],
      [0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4],
    );
    expect(meshDeviation(flat, dipped).maxDeviationMm).toBeGreaterThan(0.3);
  });

  it('reports the offset between two parallel surfaces', () => {
    const r = meshDeviation(quadAtHeight(0), quadAtHeight(2.5));
    expect(r.maxDeviationMm).toBeCloseTo(2.5, 6);
    expect(r.meanDeviationMm).toBeCloseTo(2.5, 6);
  });

  it('is symmetric — a one-sided reading would miss the overhang', () => {
    // A is a unit quad; B is the same quad PLUS a far-away tab. Every vertex
    // of A still lands on B (distance 0), so an A→B-only Hausdorff reads 0.
    const a = quadAtHeight(0);
    const b = mesh(
      [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 10, 0, 0, 11, 0, 0, 11, 1, 0],
      [0, 1, 2, 0, 2, 3, 4, 5, 6],
    );
    expect(meshDeviation(a, b).maxDeviationMm).toBeCloseTo(10, 6);
    expect(meshDeviation(b, a).maxDeviationMm).toBeCloseTo(10, 6);
  });

  it('returns zero rather than Infinity when a side has no triangles', () => {
    const empty = mesh([], []);
    expect(meshDeviation(quadAtHeight(0), empty)).toEqual({
      maxDeviationMm: 0, meanDeviationMm: 0, samples: 0, subsampled: false,
    });
  });

  it('strides a dense mesh down to the sample cap, deterministically', () => {
    const dense = MAX_SAMPLES_PER_SIDE * 3;
    const positions: number[] = [];
    for (let i = 0; i < dense; i++) positions.push(i / dense, 0, 0);
    const a: RuntimeMesh = {
      positions: new Float32Array(positions),
      normals: new Float32Array(positions.length),
      indices: new Uint32Array([0, 1, 2]),
    };
    const first = meshDeviation(a, quadAtHeight(0));
    const second = meshDeviation(a, quadAtHeight(0));
    expect(first.subsampled).toBe(true);
    expect(first.samples).toBeLessThanOrEqual(MAX_SAMPLES_PER_SIDE + 8);
    expect(second).toEqual(first);
  });
});
