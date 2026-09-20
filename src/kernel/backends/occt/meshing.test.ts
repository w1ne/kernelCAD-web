// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll, vi } from 'vitest';
import * as replicad from 'replicad';
import { initOcct } from './occtBackend';
import { meshShape, meshFaceToGeometry, COARSE_MESH_OPTIONS, FINE_MESH_OPTIONS } from './meshing';

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

/** A minimal face-shaped stub: `meshFaceToGeometry` only needs `mesh()` to
 *  produce vertices/triangles/normals to reach the cylinder extractor. */
function stubFace(extra: Record<string, unknown>): unknown {
  return {
    mesh: () => ({
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      triangles: [0, 1, 2],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
    }),
    ...extra,
  };
}

describe('tryExtractCylinderFromFace — characterisation', () => {
  it('reads radius, axis and axis origin off a real OCCT cylindrical face', () => {
    const cyl = replicad.makeCylinder(5, 10);
    const cylinders = cyl.faces
      .map((f, i) => meshFaceToGeometry(f, i))
      .filter(g => g !== null)
      .map(g => g!.cylinder)
      .filter(c => c !== undefined);
    expect(cylinders).toHaveLength(1);
    expect(cylinders[0]).toEqual({ origin: [0, 0, 0], axis: [0, 0, 1], radius: 5 });
  });

  it('falls back to direct origin/axis/radius properties', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const geometry = meshFaceToGeometry(
      stubFace({ geomType: 'CYLINDER', origin: [1, 2, 3], axis: [0, 0, 1], radius: 4 }),
      7,
    );
    expect(geometry?.cylinder).toEqual({ origin: [1, 2, 3], axis: [0, 0, 1], radius: 4 });
    expect(geometry?.faceId).toBe(7);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('reads cylinder data from the surface and geom sub-objects', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const viaSurface = meshFaceToGeometry(
      stubFace({ surface: { origin: [9, 8, 7], axis: [1, 0, 0], radius: 2 } }),
      0,
    );
    expect(viaSurface?.cylinder).toEqual({ origin: [9, 8, 7], axis: [1, 0, 0], radius: 2 });
    const viaGeom = meshFaceToGeometry(
      stubFace({ geom: { location: [4, 5, 6], direction: [0, 1, 0], radius: 3 } }),
      0,
    );
    expect(viaGeom?.cylinder).toEqual({ origin: [4, 5, 6], axis: [0, 1, 0], radius: 3 });
    warn.mockRestore();
  });

  it('returns no cylinder for a non-cylindrical geomType', () => {
    const geometry = meshFaceToGeometry(
      stubFace({ geomType: 'PLANE', origin: [0, 0, 0], axis: [0, 0, 1], radius: 1 }),
      0,
    );
    expect(geometry?.cylinder).toBeUndefined();
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
