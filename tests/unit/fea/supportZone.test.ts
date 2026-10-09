// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Support-zone classification (the nodes next to a fixed-face edge whose
// stress is the clamp singularity), on hand-built meshes.

import { describe, it, expect } from 'vitest';
import { boundaryEdges, supportZone, type SupportZoneMesh } from '../../../src/kernel/fea/supportZone';

type Tri = [number, number, number];

/** Box [0,L]x[0,W]x[0,H] of unit cells (edge h), 6 linear tets per cell, with
 *  its skin triangles grouped by face. */
function box(L: number, W: number, H: number, h: number) {
  const nx = Math.round(L / h), ny = Math.round(W / h), nz = Math.round(H / h);
  const nodes = new Map<number, readonly [number, number, number]>();
  const id = (i: number, j: number, k: number) => 1 + i + (nx + 1) * (j + (ny + 1) * k);
  for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    nodes.set(id(i, j, k), [i * h, j * h, k * h]);
  }
  const elements: Array<{ nodes: number[] }> = [];
  const paths = [[1, 2, 4], [1, 4, 2], [2, 1, 4], [2, 4, 1], [4, 1, 2], [4, 2, 1]];
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    for (const p of paths) {
      let c = 0;
      const corners = [id(i, j, k)];
      for (const bit of p) {
        c |= bit;
        corners.push(id(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1)));
      }
      elements.push({ nodes: corners });
    }
  }
  // Skin triangles that match the Kuhn split (diagonal through the cell's
  // lowest corner on every face), so each is a face of one tet.
  const faces: Record<string, Tri[]> = { x0: [], x1: [], y0: [], y1: [], z0: [], z1: [] };
  const quad = (key: string, a: number, b: number, c: number, d: number) => { faces[key].push([a, b, c], [a, c, d]); };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    quad('z0', id(i, j, 0), id(i + 1, j, 0), id(i + 1, j + 1, 0), id(i, j + 1, 0));
    quad('z1', id(i, j, nz), id(i + 1, j, nz), id(i + 1, j + 1, nz), id(i, j + 1, nz));
  }
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
    quad('y0', id(i, 0, k), id(i + 1, 0, k), id(i + 1, 0, k + 1), id(i, 0, k + 1));
    quad('y1', id(i, ny, k), id(i + 1, ny, k), id(i + 1, ny, k + 1), id(i, ny, k + 1));
  }
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) {
    quad('x0', id(0, j, k), id(0, j + 1, k), id(0, j + 1, k + 1), id(0, j, k + 1));
    quad('x1', id(nx, j, k), id(nx, j + 1, k), id(nx, j + 1, k + 1), id(nx, j, k + 1));
  }
  const mesh: SupportZoneMesh = { nodes, elements, skinTris: Object.values(faces).flat() };
  return { mesh, faces, at: (x: number, y: number, z: number) => id(x / h, y / h, z / h) };
}

describe('boundaryEdges', () => {
  it('keeps the outline of a triangle set and drops the shared diagonal', () => {
    const edges = boundaryEdges([[1, 2, 3], [1, 3, 4]]).map(e => e.join('-')).sort();
    expect(edges).toEqual(['1-2', '1-4', '2-3', '3-4']);
  });
});

describe('supportZone', () => {
  // A 20 x 4 x 2 bar clamped on its x = 0 end. The wall is 2 thick across
  // z and 4 across y, so the zone reaches 0.4 * 2 = 0.8 from the top and
  // bottom edges and 0.4 * 4 = 1.6 from the side edges.
  const { mesh, faces, at } = box(20, 4, 2, 1);

  it('sizes the zone from the local wall thickness, not the element size', () => {
    const zone = supportZone(mesh, faces.x0);
    expect(zone.boundaryEdgeCount).toBe(12);
    expect(zone.radiusMm!.min).toBeCloseTo(0.8, 2);
    expect(zone.radiusMm!.max).toBeCloseTo(1.6, 2);
  });

  it('flags nodes on and near the clamp edge, not the clamp interior or the far field', () => {
    const { adjacent } = supportZone(mesh, faces.x0);
    expect(adjacent.has(at(0, 0, 1))).toBe(true);   // on a side edge
    expect(adjacent.has(at(0, 2, 2))).toBe(true);   // on the top edge
    expect(adjacent.has(at(1, 0, 1))).toBe(true);   // 1 from a side edge (< 1.6)
    expect(adjacent.has(at(0, 2, 1))).toBe(false);  // middle of the clamped face
    expect(adjacent.has(at(1, 2, 2))).toBe(false);  // 1 from the top edge (> 0.8)
    expect(adjacent.has(at(5, 2, 2))).toBe(false);  // far along the bar
  });

  it('treats two fixed faces sharing an edge as one clamp with no seam singularity', () => {
    // x0 and y0 both fixed: their common edge (x = 0, y = 0) is inside the clamp.
    const { adjacent } = supportZone(mesh, [...faces.x0, ...faces.y0]);
    expect(adjacent.has(at(0, 0, 1))).toBe(false);
    expect(adjacent.has(at(0, 0, 2))).toBe(true);
  });

  it('returns an empty zone when the fixed region has no edge', () => {
    const zone = supportZone(mesh, mesh.skinTris);
    expect(zone.adjacent.size).toBe(0);
    expect(zone.boundaryEdgeCount).toBe(0);
  });
});
