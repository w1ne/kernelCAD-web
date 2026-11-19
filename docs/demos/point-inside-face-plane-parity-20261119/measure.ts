// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Measures TriangleBvh.pointInside on two meshes and prints JSON.
//
//   npx tsx docs/demos/point-inside-face-plane-parity-20261119/measure.ts

import { TriangleBvh } from '../../../src/modeling/runtime/dfm/meshBvh';

// Slab x 0..990, y -400..400, z -60..0 with a post x 375..465, y -60..60,
// z 0..1000 on it, as one watertight solid.
function slabWithPost() {
  const rect = (x0: number, x1: number, y0: number, y1: number, z: number) =>
    [x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z];
  const vertices = [
    ...rect(0, 990, -400, 400, -60),
    ...rect(0, 990, -400, 400, 0),
    ...rect(375, 465, -60, 60, 0),
    ...rect(375, 465, -60, 60, 1000),
  ];
  const triangles = [0, 2, 1, 0, 3, 2, 12, 13, 14, 12, 14, 15];
  for (const [lo, hi] of [[0, 4], [4, 8], [8, 12]]) {
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      triangles.push(lo + i, lo + j, hi + j, lo + i, hi + j, hi + i);
    }
  }
  return { vertices, triangles };
}

// Closed 200 x 200 latitude-longitude mesh of a sphere, radius 50 mm.
function sphere() {
  const n = 200;
  const vertices: number[] = [];
  const triangles: number[] = [];
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i < n; i++) {
      const th = Math.PI * j / n;
      const ph = 2 * Math.PI * i / n;
      vertices.push(50 * Math.sin(th) * Math.cos(ph), 50 * Math.sin(th) * Math.sin(ph), 50 * Math.cos(th));
    }
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * n + i;
      const b = j * n + (i + 1) % n;
      triangles.push(a, a + n, b, b, a + n, b + n);
    }
  }
  return { vertices, triangles };
}

const post = new TriangleBvh(slabWithPost());
const junction = ([[420, 0, 0], [420, -30, 0], [380, 55, 0]] as [number, number, number][])
  .map((p) => ({ point: p, expected: true, inside: post.pointInside(p) }));

// Every point of a 2 mm lattice in the 120 mm cube. The exact answer is the
// number of lattice points closer than 50 mm to the centre; points 49.9 mm or
// farther are left out of the comparison because the mesh is inside the sphere.
const ball = new TriangleBvh(sphere());
let wrong = 0;
let compared = 0;
let msBest = Infinity;
for (let run = 0; run < 3; run++) {
  wrong = 0;
  compared = 0;
  const t0 = performance.now();
  for (let x = -60; x <= 60; x += 2) {
    for (let y = -60; y <= 60; y += 2) {
      for (let z = -60; z <= 60; z += 2) {
        const r = Math.hypot(x, y, z);
        const inside = ball.pointInside([x, y, z]);
        if (r >= 49.9 && r <= 50) continue;
        compared++;
        if (inside !== (r < 50)) wrong++;
      }
    }
  }
  msBest = Math.min(msBest, performance.now() - t0);
}

console.log(JSON.stringify({
  junction,
  sphereLattice: { points: 61 ** 3, compared, wrong, bestOf3Ms: Math.round(msBest) },
}, null, 2));
