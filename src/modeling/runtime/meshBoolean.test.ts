// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { booleanTriangleMeshes, MeshBooleanError, type BooleanTriangleMesh } from './meshBoolean';

function cube(size: number, offsetX = 0): BooleanTriangleMesh {
  const h = size / 2;
  const positions = [
    -h + offsetX, -h, -h, h + offsetX, -h, -h, h + offsetX, h, -h, -h + offsetX, h, -h,
    -h + offsetX, -h, h, h + offsetX, -h, h, h + offsetX, h, h, -h + offsetX, h, h,
  ];
  const indices = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4,
    1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7];
  return { positions, indices };
}

function sphere(radius = 1, subdivisions = 2): BooleanTriangleMesh {
  const t = (1 + Math.sqrt(5)) / 2;
  const vertices: number[][] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(v => { const n = Math.hypot(...v); return v.map(x => x / n * radius); });
  let faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  for (let level = 0; level < subdivisions; level++) {
    const cache = new Map<string, number>();
    const midpoint = (a: number, b: number) => {
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      let index = cache.get(key);
      if (index !== undefined) return index;
      const v = vertices[a].map((x, i) => (x + vertices[b][i]) / 2);
      const n = Math.hypot(...v);
      index = vertices.length;
      vertices.push(v.map(x => x / n * radius));
      cache.set(key, index);
      return index;
    };
    faces = faces.flatMap(([a, b, c]) => {
      const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
      return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]];
    });
  }
  faces = faces.map(face => {
    const [a, b, c] = face.map(i => vertices[i]);
    const ab = b.map((x, i) => x - a[i]), ac = c.map((x, i) => x - a[i]);
    const normal = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    return normal[0] * a[0] + normal[1] * a[1] + normal[2] * a[2] < 0 ? [face[0], face[2], face[1]] : face;
  });
  return { positions: vertices.flat(), indices: faces.flat() };
}

describe('booleanTriangleMeshes', () => {
  it('computes cube union, subtraction, and intersection volumes', async () => {
    const a = cube(2), b = cube(2, 1);
    await expect(booleanTriangleMeshes('union', a, b)).resolves.toMatchObject({ volume: 12 });
    await expect(booleanTriangleMeshes('subtract', a, b)).resolves.toMatchObject({ volume: 4 });
    await expect(booleanTriangleMeshes('intersect', a, b)).resolves.toMatchObject({ volume: 4 });
  });

  it('computes the volume of a faceted sphere union with a disjoint copy', async () => {
    const a = sphere(1, 2);
    const source = sphere(1, 2);
    const b = { positions: Array.from(source.positions), indices: source.indices };
    for (let i = 0; i < b.positions.length; i += 3) b.positions[i] += 4;
    const result = await booleanTriangleMeshes('union', a, b);
    // This icosphere tessellation encloses about 4.047 mm³ per unit sphere.
    expect(result.volume).toBeCloseTo((8 * Math.PI) / 3, 0);
    expect(result.indices.length / 3).toBeGreaterThan(0);
  });

  it('reports open/non-manifold meshes as a controlled error', async () => {
    const open = { positions: cube(2).positions, indices: cube(2).indices.slice(0, 33) };
    await expect(booleanTriangleMeshes('union', open, cube(2))).rejects.toBeInstanceOf(MeshBooleanError);
    await expect(booleanTriangleMeshes('union', open, cube(2))).rejects.toThrow(/non-manifold|open/i);
  });
});
