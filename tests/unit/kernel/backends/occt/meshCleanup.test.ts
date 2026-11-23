// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/kernel/backends/occt/meshCleanup.test.ts

import { describe, it, expect } from 'vitest';
import { cleanupExportMesh } from '../../../../../src/kernel/backends/occt/meshCleanup';

/** Closed prism: a 0..10 square in XY extruded to z=h, each side wall split into `rows` rows. */
function splitWallBox(rows: number, h = 10): { vertices: number[]; triangles: number[] } {
  const corners = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const vertices: number[] = [];
  const id = (c: number, r: number) => r * 4 + (c % 4);
  for (let r = 0; r <= rows; r++) for (const [x, y] of corners) vertices.push(x, y, (h * r) / rows);
  const triangles: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 4; c++) {
      const a = id(c, r), b = id(c + 1, r), cc = id(c + 1, r + 1), d = id(c, r + 1);
      triangles.push(a, b, cc, a, cc, d);
    }
  }
  triangles.push(id(0, 0), id(2, 0), id(1, 0), id(0, 0), id(3, 0), id(2, 0));
  triangles.push(id(0, rows), id(1, rows), id(2, rows), id(0, rows), id(2, rows), id(3, rows));
  return { vertices, triangles };
}

describe('cleanupExportMesh', () => {
  it('removes the rows of a wall split along straight rulings without moving it', () => {
    const mesh = splitWallBox(5);
    const stats = cleanupExportMesh(mesh);
    expect(stats.applied).toBe(true);
    expect(mesh.triangles.length / 3).toBe(12);
    const zs = new Set<number>();
    for (let i = 2; i < mesh.vertices.length; i += 3) zs.add(mesh.vertices[i]);
    expect([...zs].sort((a, b) => a - b)).toEqual([0, 10]);
  });

  it('leaves an open mesh untouched', () => {
    const mesh = splitWallBox(3);
    mesh.triangles.splice(0, 3);
    const before = mesh.triangles.slice();
    const stats = cleanupExportMesh(mesh);
    expect(stats.applied).toBe(false);
    expect(mesh.triangles).toEqual(before);
  });

  it('flips a cap away', () => {
    // Tetrahedron a b c d with its side face (a, b, d) split at p, which sits
    // 1e-5 mm off edge a-b. The sliver (a, b, p) is a cap.
    const vertices = [0, 0, 0, 10, 0, 0, 5, 10, 0, 5, 5, 10, 5, -1e-5, 0];
    const [a, b, c, d, p] = [0, 1, 2, 3, 4];
    const mesh = {
      vertices,
      triangles: [a, c, b, b, c, d, c, a, d, a, p, d, p, b, d, a, b, p],
    };
    const stats = cleanupExportMesh(mesh);
    expect(stats.applied).toBe(true);
    expect(stats.flipped).toBeGreaterThan(0);
    expect(minHeightRatio(mesh)).toBeGreaterThan(1e-3);
  });
});

/** Smallest (altitude / longest edge) over all triangles. */
function minHeightRatio(mesh: { vertices: number[]; triangles: number[] }): number {
  const V = mesh.vertices, T = mesh.triangles;
  let worst = Infinity;
  for (let t = 0; t < T.length; t += 3) {
    const P = [0, 1, 2].map(k => [V[3 * T[t + k]], V[3 * T[t + k] + 1], V[3 * T[t + k] + 2]]);
    const u = P[1].map((x, i) => x - P[0][i]), w = P[2].map((x, i) => x - P[0][i]);
    const area2 = Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]);
    const longest = Math.max(...[[0, 1], [1, 2], [2, 0]].map(([i, j]) => Math.hypot(...P[i].map((x, k) => x - P[j][k]))));
    worst = Math.min(worst, area2 / longest / longest);
  }
  return worst;
}
