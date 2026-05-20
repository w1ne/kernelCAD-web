// src/modeling/capture/planarUv.test.ts

import { describe, it, expect } from 'vitest';
import { generatePlanarUVs } from './planarUv';
import type { FaceGeometry } from '../../shared/worker/workerTypes';

function makeFace(opts: {
  vertices: number[];
  normal?: [number, number, number];
  vertexNormals?: number[];
}): FaceGeometry {
  const normals = opts.vertexNormals
    ? new Float32Array(opts.vertexNormals)
    : new Float32Array(opts.vertices.length); // zero-filled
  return {
    vertices: new Float32Array(opts.vertices),
    indices: new Uint32Array(0),
    normals,
    faceId: 0,
    ...(opts.normal ? { plane: { origin: [0, 0, 0], normal: opts.normal } } : {}),
  };
}

describe('generatePlanarUVs', () => {
  it('maps a Z-up square to [0,1]×[0,1] using X and Y', () => {
    // 1x1 square at z=0, normal = +Z. Drops Z; UV from X, Y.
    const face = makeFace({
      vertices: [
        0, 0, 0,
        1, 0, 0,
        1, 1, 0,
        0, 1, 0,
      ],
      normal: [0, 0, 1],
    });
    const uvs = generatePlanarUVs(face);
    expect(uvs.length).toBe(8); // 4 verts × 2 components
    // (0,0,0) → (0,0); (1,0,0) → (1,0); (1,1,0) → (1,1); (0,1,0) → (0,1).
    expect(Array.from(uvs)).toEqual([0, 0, 1, 0, 1, 1, 0, 1]);
  });

  it('maps a Y-axis-normal rectangle to [0,1]² using X and Z', () => {
    const face = makeFace({
      vertices: [
        0, 5, 0,
        2, 5, 0,
        2, 5, 4,
        0, 5, 4,
      ],
      normal: [0, 1, 0],
    });
    const uvs = generatePlanarUVs(face);
    // Drops Y; UV from X, Z. Bbox: X∈[0,2], Z∈[0,4].
    expect(Array.from(uvs)).toEqual([0, 0, 1, 0, 1, 1, 0, 1]);
  });

  it('returns deterministic output across recomputes', () => {
    const face = makeFace({
      vertices: [0, 0, 0, 3, 0, 0, 3, 7, 0],
      normal: [0, 0, 1],
    });
    const a = generatePlanarUVs(face);
    const b = generatePlanarUVs(face);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('degenerate face (single point) → all-zero UVs', () => {
    const face = makeFace({
      vertices: [1, 1, 1],
      normal: [0, 0, 1],
    });
    const uvs = generatePlanarUVs(face);
    expect(Array.from(uvs)).toEqual([0, 0]);
  });

  it('empty face → empty Float32Array', () => {
    const face = makeFace({ vertices: [], normal: [0, 0, 1] });
    const uvs = generatePlanarUVs(face);
    expect(uvs.length).toBe(0);
  });

  it('falls back to averaged vertex normals when plane is absent', () => {
    // No plane, but vertex normals all point +Z → drop Z, use X,Y.
    const face = makeFace({
      vertices: [
        0, 0, 0,
        2, 0, 0,
        2, 2, 0,
        0, 2, 0,
      ],
      vertexNormals: [
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
      ],
    });
    const uvs = generatePlanarUVs(face);
    expect(Array.from(uvs)).toEqual([0, 0, 1, 0, 1, 1, 0, 1]);
  });

  it('all UVs are inside [0,1] for arbitrary axis-aligned faces', () => {
    const face = makeFace({
      vertices: [-3, -7, 0, 4, -7, 0, 4, 9, 0, -3, 9, 0],
      normal: [0, 0, 1],
    });
    const uvs = generatePlanarUVs(face);
    for (let i = 0; i < uvs.length; i++) {
      expect(uvs[i]).toBeGreaterThanOrEqual(0);
      expect(uvs[i]).toBeLessThanOrEqual(1);
    }
  });
});
