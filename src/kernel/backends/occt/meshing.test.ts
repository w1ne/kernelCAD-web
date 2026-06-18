// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { initOcct } from './occtBackend';
import { meshShape, COARSE_MESH_OPTIONS, FINE_MESH_OPTIONS } from './meshing';

/** Total triangle count across all face geometries of a mesh result. */
function triCount(result: { faces: { indices: ArrayLike<number> }[] }): number {
  return result.faces.reduce((sum, f) => sum + f.indices.length / 3, 0);
}

beforeAll(async () => {
  await initOcct();
});

describe('meshShape', () => {
  it('meshes a 10×10×10 box into 6 face geometries with non-empty vertex arrays', () => {
    const box = replicad.makeBaseBox(10, 10, 10);
    const result = meshShape(box);
    expect(result).not.toBeNull();
    expect(result!.faces).toHaveLength(6);
    for (const f of result!.faces) {
      expect(f.vertices.length).toBeGreaterThan(0);
      expect(f.indices.length).toBeGreaterThan(0);
      expect(f.normals.length).toBe(f.vertices.length);
    }
    expect(result!.volume).toBeGreaterThan(990); // ~1000 minus mesh tolerance
  });

  it('meshes a cylinder into 3 face geometries (top, bottom, lateral)', () => {
    const cyl = replicad.makeCylinder(5, 10);
    const result = meshShape(cyl);
    expect(result).not.toBeNull();
    expect(result!.faces).toHaveLength(3);
    expect(result!.volume).toBeGreaterThan(700); // π·25·10 ≈ 785
  });

  it('extracts edges as a Float32Array', () => {
    const box = replicad.makeBaseBox(5, 5, 5);
    const result = meshShape(box);
    expect(result).not.toBeNull();
    expect(result!.edges).toBeInstanceOf(Float32Array);
    expect(result!.edges!.length).toBeGreaterThan(0);
  });
});

describe('meshShape coarse fast-path', () => {
  it('defaults to the fine preset when no options are passed (unchanged behavior)', () => {
    const sphere = replicad.makeSphere(20);
    const implicit = meshShape(sphere);
    const explicit = meshShape(replicad.makeSphere(20), FINE_MESH_OPTIONS);
    expect(implicit).not.toBeNull();
    expect(explicit).not.toBeNull();
    // Same preset → same tessellation density.
    expect(triCount(implicit!)).toBe(triCount(explicit!));
  });

  it('produces a correct, positive-volume, non-empty coarse mesh', () => {
    const cyl = replicad.makeCylinder(10, 20);
    const coarse = meshShape(cyl, COARSE_MESH_OPTIONS);
    expect(coarse).not.toBeNull();
    expect(coarse!.faces.length).toBeGreaterThan(0);
    for (const f of coarse!.faces) {
      expect(f.vertices.length).toBeGreaterThan(0);
      expect(f.indices.length).toBeGreaterThan(0);
      expect(f.normals.length).toBe(f.vertices.length);
    }
    // Topology is preserved at coarse quality — volume stays close to π·100·20 ≈ 6283.
    expect(coarse!.volume).toBeGreaterThan(5000);
  });

  it('emits a coarser (fewer-triangle) mesh than the fine preset on a curved shape', () => {
    // Fresh shape per preset: OCCT caches triangulation on the TopoDS, so meshing
    // the same instance twice would let the second call reuse the first mesh.
    const fine = meshShape(replicad.makeSphere(30), FINE_MESH_OPTIONS);
    const coarse = meshShape(replicad.makeSphere(30), COARSE_MESH_OPTIONS);
    expect(fine).not.toBeNull();
    expect(coarse).not.toBeNull();
    expect(triCount(coarse!)).toBeLessThan(triCount(fine!));
  });
});
