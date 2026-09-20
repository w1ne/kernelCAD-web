// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/mates/mechanicalPlausibility.test.ts
//
// Characterisation tests for `analyzeDisconnectedMesh` ahead of its complexity
// split. Pins the structured outputs (componentCount, largestComponentTriangleCount,
// maxComponentGapMm) for connected, floating, within-tolerance, and
// over-fragmented meshes, plus the exact-clustering component cap boundary.
import { describe, it, expect } from 'vitest';
import { analyzeDisconnectedMesh } from './mechanicalPlausibility';
import type { RuntimeMesh } from '../../kernel/backends/runtimeMesh';

function mesh(positions: number[], indices: number[]): RuntimeMesh {
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(0),
    indices: new Uint32Array(indices),
  };
}

// Unit quad at the origin, two triangles sharing edge (0, 2).
const QUAD_POSITIONS = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0];
const QUAD_INDICES = [0, 1, 2, 0, 2, 3];

// A single triangle with its first vertex at (x, y, 0).
function triangleAt(x: number, y: number): { positions: number[]; indices: number[] } {
  return {
    positions: [x, y, 0, x + 1, y, 0, x, y + 1, 0],
    indices: [0, 1, 2],
  };
}

function mergeMesh(
  parts: Array<{ positions: number[]; indices: number[] }>,
): RuntimeMesh {
  const positions: number[] = [];
  const indices: number[] = [];
  for (const part of parts) {
    const base = positions.length / 3;
    positions.push(...part.positions);
    indices.push(...part.indices.map((index) => index + base));
  }
  return mesh(positions, indices);
}

describe('analyzeDisconnectedMesh', () => {
  it('returns undefined for a single triangle', () => {
    const tri = triangleAt(0, 0);
    expect(analyzeDisconnectedMesh(mesh(tri.positions, tri.indices))).toBeUndefined();
  });

  it('returns undefined for a connected quad', () => {
    expect(analyzeDisconnectedMesh(mesh(QUAD_POSITIONS, QUAD_INDICES))).toBeUndefined();
  });

  it('reports the floating component, its triangle count, and the exact gap', () => {
    expect(
      analyzeDisconnectedMesh(
        mergeMesh([
          { positions: QUAD_POSITIONS, indices: QUAD_INDICES },
          triangleAt(10, 0),
        ]),
      ),
    ).toEqual({
      componentCount: 2,
      largestComponentTriangleCount: 2,
      maxComponentGapMm: 9,
    });
  });

  it('merges components whose nearest vertices are within the 0.05 mm tolerance', () => {
    expect(
      analyzeDisconnectedMesh(
        mergeMesh([
          { positions: QUAD_POSITIONS, indices: QUAD_INDICES },
          triangleAt(1.04, 0),
        ]),
      ),
    ).toBeUndefined();
  });

  it('returns undefined when exactly 1000 components sit at the exact-clustering cap', () => {
    const parts = Array.from({ length: 1000 }, (_, i) => triangleAt(i * 10, 0));
    expect(analyzeDisconnectedMesh(mergeMesh(parts))).toEqual({
      componentCount: 1000,
      largestComponentTriangleCount: 1,
      maxComponentGapMm: 9989,
    });
  });

  it('returns undefined when components exceed the 1000-component cap', () => {
    const parts = Array.from({ length: 1001 }, (_, i) => triangleAt(i * 10, 0));
    expect(analyzeDisconnectedMesh(mergeMesh(parts))).toBeUndefined();
  });
});
