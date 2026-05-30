// tests/unit/kernel/backends/occt/assertWatertight.test.ts
//
// Half-edge sanity gate for the 3MF + (future) Manifold writer. Every
// undirected edge must be shared by exactly two triangles for the mesh to
// pass `open3d.is_watertight()`; this module is the runtime gate that
// rejects non-manifold inputs before they reach the OPC zip writer.

import { describe, it, expect } from 'vitest';
import {
  assertWatertight,
  isWatertight,
} from '../../../../../src/kernel/backends/occt/assertWatertight';

describe('assertWatertight', () => {
  it('passes a closed tetrahedron (every edge shared by exactly 2 triangles)', () => {
    const mesh = {
      vertices: [0, 0, 0,  1, 0, 0,  0, 1, 0,  0, 0, 1],
      triangles: [0, 2, 1,  0, 1, 3,  0, 3, 2,  1, 2, 3],
    };
    expect(isWatertight(mesh)).toBe(true);
    expect(() => assertWatertight(mesh)).not.toThrow();
  });

  it('rejects an open mesh (single triangle)', () => {
    const mesh = { vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0], triangles: [0, 1, 2] };
    expect(isWatertight(mesh)).toBe(false);
    expect(() => assertWatertight(mesh)).toThrow(/not.*watertight/i);
  });

  it('rejects a mesh with a non-manifold edge (3+ triangles sharing an edge)', () => {
    // Two triangles share edge 0-1; a third triangle also uses edge 0-1.
    const mesh = {
      vertices: [0, 0, 0,  1, 0, 0,  0, 1, 0,  0, -1, 0,  0.5, 0, 1],
      triangles: [0, 1, 2,  0, 3, 1,  0, 1, 4],
    };
    expect(isWatertight(mesh)).toBe(false);
  });
});
