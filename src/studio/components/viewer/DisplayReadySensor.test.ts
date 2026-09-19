// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { hasNonemptyGeometry } from './DisplayReadySensor';
import type { GeometryResult } from '../../../shared/worker/geometryEngine';

function geom(face: { vertices: number; indices: number }): GeometryResult {
  return {
    faces: [
      {
        faceId: 1,
        vertices: new Float32Array(face.vertices),
        indices: new Uint32Array(face.indices),
        normals: new Float32Array(face.vertices),
      },
    ],
  };
}

describe('hasNonemptyGeometry', () => {
  it('is false for empty or degenerate meshes', () => {
    expect(hasNonemptyGeometry([])).toBe(false);
    expect(hasNonemptyGeometry([geom({ vertices: 0, indices: 0 })])).toBe(false);
    expect(hasNonemptyGeometry([geom({ vertices: 9, indices: 2 })])).toBe(false);
  });

  it('is true when a face has a triangle', () => {
    expect(hasNonemptyGeometry([geom({ vertices: 9, indices: 3 })])).toBe(true);
  });
});
