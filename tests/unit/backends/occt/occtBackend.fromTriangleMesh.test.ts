// tests/unit/backends/occt/occtBackend.fromTriangleMesh.test.ts
//
// Acceptance test for the mesh-to-Shape escape path used by sdf.materialize
// (W2.3) and reserved for future `lib.fromSTL` / `lib.fromOBJ` / orphaned
// `importedMesh` lowerer. Drives the cube fixture and asserts a closed
// solid with volume ≈ 1.0.

import { describe, it, expect, beforeAll } from 'vitest';
import { OcctBackend, initOcct } from '../../../../src/backends/occt/occtBackend';

beforeAll(async () => {
  await initOcct();
});

/**
 * Unit cube spanning [0,1]^3, expressed as 8 verts + 12 triangles (2 per face).
 * Triangle winding is consistently outward-facing.
 */
function unitCubeMesh(): { vertices: Float32Array; indices: Uint32Array } {
  // 8 corner vertices.
  const vertices = new Float32Array([
    0, 0, 0,  // 0
    1, 0, 0,  // 1
    1, 1, 0,  // 2
    0, 1, 0,  // 3
    0, 0, 1,  // 4
    1, 0, 1,  // 5
    1, 1, 1,  // 6
    0, 1, 1,  // 7
  ]);
  // 12 triangles, outward-facing.
  const indices = new Uint32Array([
    // bottom (z=0), outward normal -Z → CW from +Z = CCW from -Z
    0, 2, 1,  0, 3, 2,
    // top (z=1), outward normal +Z
    4, 5, 6,  4, 6, 7,
    // front (y=0), outward -Y
    0, 1, 5,  0, 5, 4,
    // back (y=1), outward +Y
    3, 7, 6,  3, 6, 2,
    // left (x=0), outward -X
    0, 4, 7,  0, 7, 3,
    // right (x=1), outward +X
    1, 2, 6,  1, 6, 5,
  ]);
  return { vertices, indices };
}

describe('OcctBackend.fromTriangleMesh', () => {
  it('builds a closed solid from a unit-cube triangle soup', () => {
    const { vertices, indices } = unitCubeMesh();
    const backend = OcctBackend.fromTriangleMesh(vertices, indices);
    expect(backend).toBeInstanceOf(OcctBackend);
    // A unit cube has volume 1.0. Sewing precision is 1 µm; allow ±1e-3.
    const v = backend.volume();
    expect(v).toBeGreaterThan(0.999);
    expect(v).toBeLessThan(1.001);
  });

  it('reports a bbox spanning [0,1]^3 for the unit cube', () => {
    const { vertices, indices } = unitCubeMesh();
    const backend = OcctBackend.fromTriangleMesh(vertices, indices);
    const bb = backend.boundingBox();
    expect(bb.min[0]).toBeCloseTo(0, 3);
    expect(bb.min[1]).toBeCloseTo(0, 3);
    expect(bb.min[2]).toBeCloseTo(0, 3);
    expect(bb.max[0]).toBeCloseTo(1, 3);
    expect(bb.max[1]).toBeCloseTo(1, 3);
    expect(bb.max[2]).toBeCloseTo(1, 3);
  });

  it('rejects empty / mismatched inputs with a clear error', () => {
    expect(() => OcctBackend.fromTriangleMesh(new Float32Array(0), new Uint32Array(0)))
      .toThrow(/at least one triangle/);
    expect(() => OcctBackend.fromTriangleMesh(new Float32Array([0, 0, 0]), new Uint32Array([0, 1, 2])))
      .toThrow(/index .* out of range/);
    expect(() => OcctBackend.fromTriangleMesh(
      new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      new Uint32Array([0, 1])  // not a multiple of 3
    )).toThrow(/multiple of 3/);
  });
});
