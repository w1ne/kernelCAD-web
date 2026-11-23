// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { creasedNormalMesh } from './creasedNormals';

describe('creasedNormalMesh', () => {
  it('splits a welded vertex at a 90 degree fold and keeps each side flat', () => {
    // Two quads sharing the edge x = 1: one in z = 0, one folded up into x = 1.
    const vertices = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1];
    const triangles = [0, 1, 2, 0, 2, 3, 1, 4, 5, 1, 5, 2];
    const mesh = creasedNormalMesh(vertices, triangles);
    expect(mesh.positions.length / 3).toBe(8); // 6 welded + 2 split on the fold
    for (let i = 0; i < mesh.normals.length; i += 3) {
      const n = Array.from(mesh.normals.subarray(i, i + 3));
      expect(Math.max(...n.map(Math.abs))).toBeCloseTo(1, 6);
    }
  });

  it('keeps a shallow bend smooth with shared vertices', () => {
    const vertices = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 2, 0, 0.1, 2, 1, 0.1];
    const triangles = [0, 1, 2, 0, 2, 3, 1, 4, 5, 1, 5, 2];
    const mesh = creasedNormalMesh(vertices, triangles);
    expect(mesh.positions.length / 3).toBe(6);
    expect(Array.from(mesh.indices)).toEqual(triangles);
  });

  it('gives a degenerate sliver a unit normal from its neighbours', () => {
    const vertices = [0, 0, 0, 1, 0, 0, 0, 1, 0, 2, 0, 0];
    const triangles = [0, 1, 2, 0, 1, 3]; // second triangle has zero area
    const mesh = creasedNormalMesh(vertices, triangles);
    for (let i = 0; i < mesh.normals.length; i += 3) {
      expect(Math.hypot(mesh.normals[i]!, mesh.normals[i + 1]!, mesh.normals[i + 2]!)).toBeCloseTo(1, 6);
    }
  });
});
