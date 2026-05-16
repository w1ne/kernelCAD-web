// src/modules/sdf/marchingCubes.ts
//
// Thin wrapper around the `isosurface.surfaceNets` library. Adapts the
// library's `{ positions, cells }` return shape to our `{ vertices, indices }`
// triangle-soup contract.
//
// isosurface@1.0.0 returns `cells` as triangle 3-tuples; the quad-to-triangle
// shim is defensive in case a future version returns quads.

import iso from 'isosurface';
import type { SdfField } from './index';

export function runMarchingCubes(
  field: SdfField,
  resolution: number,
): { vertices: Float32Array; indices: Uint32Array } {
  const { min, max } = field.aabb;
  const dims: [number, number, number] = [resolution, resolution, resolution];
  // Library passes (x, y, z); our SdfField wants a Vec3 tuple.
  const potential = (x: number, y: number, z: number): number => field([x, y, z]);
  const bounds: [[number, number, number], [number, number, number]] = [
    [min[0], min[1], min[2]],
    [max[0], max[1], max[2]],
  ];

  const result = (iso as unknown as {
    surfaceNets(
      dims: [number, number, number],
      potential: (x: number, y: number, z: number) => number,
      bounds: [[number, number, number], [number, number, number]],
    ): { positions: number[][]; cells: number[][] };
  }).surfaceNets(dims, potential, bounds);

  const positions = result.positions;
  const cells = result.cells;

  const triangleIndices: number[] = [];
  for (const c of cells) {
    if (c.length === 3) {
      triangleIndices.push(c[0], c[1], c[2]);
    } else if (c.length === 4) {
      // Defensive: fan triangulation.
      triangleIndices.push(c[0], c[1], c[2]);
      triangleIndices.push(c[0], c[2], c[3]);
    }
  }

  const vertices = new Float32Array(positions.length * 3);
  for (let i = 0; i < positions.length; i++) {
    vertices[3 * i]     = positions[i][0];
    vertices[3 * i + 1] = positions[i][1];
    vertices[3 * i + 2] = positions[i][2];
  }
  return { vertices, indices: new Uint32Array(triangleIndices) };
}
