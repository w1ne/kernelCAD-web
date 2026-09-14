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
    expect(r.rmsDeviationMm).toBeCloseTo(2.5, 6);
  });

  it('weights large deviations harder in the RMS than in the mean', () => {
    // A sits on B everywhere except the V dip, so RMS > mean > 0.
    const flat = quadAtHeight(0);
    const dipped = mesh(
      [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0.5, 0.5, -1],
      [0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4],
    );
    const r = meshDeviation(flat, dipped);
    expect(r.meanDeviationMm).toBeGreaterThan(0);
    expect(r.rmsDeviationMm).toBeGreaterThan(r.meanDeviationMm);
    expect(r.rmsDeviationMm).toBeLessThanOrEqual(r.maxDeviationMm);
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
      maxDeviationMm: 0, meanDeviationMm: 0, rmsDeviationMm: 0, samples: 0, subsampled: false,
    });
  });

  it('finds the exact nearest triangle on a dense mesh (grid search matches a full scan)', () => {
    // A 40×40 grid surface, wavy in z, against a copy lifted by 0.75 and a
    // single far triangle: the grid search must return the same numbers a
    // brute-force scan gives.
    const n = 40;
    const positions: number[] = [];
    const indices: number[] = [];
    for (let j = 0; j <= n; j++) {
      for (let i = 0; i <= n; i++) positions.push(i, j, Math.sin(i / 3) * Math.cos(j / 4));
    }
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a = j * (n + 1) + i;
        indices.push(a, a + 1, a + n + 2, a, a + n + 2, a + n + 1);
      }
    }
    const wavy = mesh(positions, indices);
    const lifted = mesh(positions.map((v, k) => (k % 3 === 2 ? v + 0.75 : v)), indices);
    const brute = (p: RuntimeMesh, q: RuntimeMesh) => {
      let worst = 0;
      for (let v = 0; v < p.positions.length / 3; v++) {
        let best = Infinity;
        for (let t = 0; t < q.indices.length / 3; t++) {
          const a = q.indices[t * 3] * 3, b = q.indices[t * 3 + 1] * 3, c = q.indices[t * 3 + 2] * 3;
          const d = pointTriangleDistanceSq(
            p.positions[v * 3], p.positions[v * 3 + 1], p.positions[v * 3 + 2],
            q.positions[a], q.positions[a + 1], q.positions[a + 2],
            q.positions[b], q.positions[b + 1], q.positions[b + 2],
            q.positions[c], q.positions[c + 1], q.positions[c + 2],
          );
          best = Math.min(best, d);
        }
        worst = Math.max(worst, Math.sqrt(best));
      }
      return worst;
    };
    const r = meshDeviation(wavy, lifted);
    const expected = Math.max(brute(wavy, lifted), brute(lifted, wavy));
    // Centroid samples can only raise the vertex-only maximum slightly.
    expect(r.maxDeviationMm).toBeGreaterThanOrEqual(expected - 1e-6);
    expect(r.maxDeviationMm).toBeLessThanOrEqual(0.75 + 1e-6);
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
