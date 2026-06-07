// tests/unit/dfm/meshBvh.test.ts
//
// Triangle BVH for the DFM gates (min-wall ray sampler, voxel void
// analysis). Exercises:
//   - Möller–Trumbore on a single triangle (interior hit, parallel miss,
//     exact edge hit),
//   - real OCCT export-grade mesh (box) via meshShapeForExport: nearest
//     hit, allHits ordering/count, ray-parity pointInside,
//   - a coarse perf guard on a 100k-triangle synthetic grid.

import { describe, it, expect, beforeAll } from 'vitest';
import { TriangleBvh, type DfmMesh } from '../../../src/modeling/runtime/dfm/meshBvh';
import {
  initOcct,
  OcctBackend,
  meshShapeForExport,
} from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/modeling/buildModel';

describe('TriangleBvh — single triangle', () => {
  // Right triangle in the z=0 plane: (0,0,0) (4,0,0) (0,4,0).
  const tri: DfmMesh = {
    vertices: [0, 0, 0, 4, 0, 0, 0, 4, 0],
    triangles: [0, 1, 2],
  };

  it('hits the interior at the analytic t', () => {
    const bvh = new TriangleBvh(tri);
    expect(bvh.triangleCount).toBe(1);
    const hit = bvh.raycast([1, 1, 5], [0, 0, -1]);
    expect(hit).not.toBeNull();
    expect(hit!.t).toBeCloseTo(5, 9);
    expect(hit!.triIndex).toBe(0);
  });

  it('misses with a ray parallel to the triangle plane', () => {
    const bvh = new TriangleBvh(tri);
    expect(bvh.raycast([0, 0, 1], [1, 0, 0])).toBeNull();
    expect(bvh.allHits([0, 0, 1], [1, 0, 0])).toEqual([]);
  });

  it('reports a hit when the ray pierces an edge with t > 0', () => {
    const bvh = new TriangleBvh(tri);
    // (2,0,0) lies on the edge (0,0,0)-(4,0,0): barycentric v === 0.
    const hit = bvh.raycast([2, 0, 5], [0, 0, -1]);
    expect(hit).not.toBeNull();
    expect(hit!.t).toBeCloseTo(5, 9);
    const all = bvh.allHits([2, 0, 5], [0, 0, -1]);
    expect(all).toHaveLength(1);
    expect(all[0].t).toBeCloseTo(5, 9);
  });

  it('skips degenerate triangles at build', () => {
    const degen: DfmMesh = {
      // Second triangle is a zero-area sliver (three collinear points).
      vertices: [0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 0, 1, 0, 0, 2, 0, 0],
      triangles: [0, 1, 2, 3, 4, 5],
    };
    const bvh = new TriangleBvh(degen);
    expect(bvh.triangleCount).toBe(1);
  });

  it('respects tMin and skipTri', () => {
    const bvh = new TriangleBvh(tri);
    // Origin exactly on the surface: default tMin = 0 excludes the t = 0 hit.
    expect(bvh.raycast([1, 1, 0], [0, 0, -1])).toBeNull();
    // tMin past the hit excludes it.
    expect(bvh.raycast([1, 1, 5], [0, 0, -1], { tMin: 5.5 })).toBeNull();
    // skipTri excludes the source triangle.
    expect(bvh.raycast([1, 1, 5], [0, 0, -1], { skipTri: 0 })).toBeNull();
  });
});

describe('TriangleBvh — OCCT export mesh (box)', () => {
  let bvh: TriangleBvh;

  beforeAll(async () => {
    await initOcct();
    // box(10,10,10) is corner-origin: spans [0,10]^3 (see OcctBackend.box).
    const model = await buildModel({
      fileName: 'bvh-box.kcad.ts',
      code: 'return box(10, 10, 10);',
    });
    expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const shape = (model.rootShape as OcctBackend).getReplicadShape();
    const mesh = meshShapeForExport(shape);
    bvh = new TriangleBvh(mesh);
  }, 60000);

  it('finds the top face first from above', () => {
    // Enters the top face (z = 10) at t = 10, exits the bottom (z = 0) at t = 20.
    const hit = bvh.raycast([5, 5, 20], [0, 0, -1]);
    expect(hit).not.toBeNull();
    expect(hit!.t).toBeCloseTo(10, 6);
  });

  it('allHits returns both crossings in ascending t', () => {
    // (5.1, 5.2) avoids the planar faces' triangulation diagonal, so each
    // crossing lands in exactly one triangle's interior.
    const hits = bvh.allHits([5.1, 5.2, 20], [0, 0, -1]);
    expect(hits).toHaveLength(2);
    expect(hits[0].t).toBeCloseTo(10, 6);
    expect(hits[1].t).toBeCloseTo(20, 6);
    expect(hits[0].t).toBeLessThan(hits[1].t);
  });

  it('reports a ray through a shared face-diagonal edge once per incident triangle', () => {
    // (5,5) is the face center, on the triangulation diagonal of the top and
    // bottom faces: both incident triangles report each crossing. allHits is
    // raw by design — parity consumers dedup by t.
    const hits = bvh.allHits([5, 5, 20], [0, 0, -1]);
    expect(hits.length).toBeGreaterThanOrEqual(2);
    const distinct = hits.filter((h, i) => i === 0 || h.t - hits[i - 1].t > 1e-9);
    expect(distinct).toHaveLength(2);
    expect(distinct[0].t).toBeCloseTo(10, 6);
    expect(distinct[1].t).toBeCloseTo(20, 6);
  });

  it('pointInside agrees with the box volume', () => {
    expect(bvh.pointInside([5, 5, 5])).toBe(true);
    expect(bvh.pointInside([5, 5, 15])).toBe(false);
    // Just outside the x = 0 face: the +X parity ray crosses both x-faces.
    expect(bvh.pointInside([-1e-4, 5, 5])).toBe(false);
  });
});

describe('TriangleBvh — perf guard', () => {
  it('builds and queries a ~100k-triangle grid in under 1s', () => {
    // (n+1)^2 vertex grid over [0,n]^2 at z = 0, two triangles per cell.
    const n = 224; // 2 * 224^2 = 100352 triangles
    const vertices: number[] = [];
    for (let j = 0; j <= n; j++) {
      for (let i = 0; i <= n; i++) vertices.push(i, j, 0);
    }
    const triangles: number[] = [];
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a = j * (n + 1) + i;
        const b = a + 1;
        const c = a + (n + 1);
        const d = c + 1;
        triangles.push(a, b, d, a, d, c);
      }
    }
    const mesh: DfmMesh = { vertices, triangles };

    const t0 = performance.now();
    const bvh = new TriangleBvh(mesh);
    expect(bvh.triangleCount).toBe(2 * n * n);
    let hits = 0;
    for (let k = 0; k < 1000; k++) {
      const x = ((k * 7919) % (n * 100)) / 100 + 0.005;
      const y = ((k * 104729) % (n * 100)) / 100 + 0.005;
      const hit = bvh.raycast([x, y, 5], [0, 0, -1]);
      if (hit) hits++;
    }
    const elapsed = performance.now() - t0;
    expect(hits).toBe(1000);
    expect(elapsed).toBeLessThan(1000);
  });
});
