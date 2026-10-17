// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll, vi } from 'vitest';
import * as replicad from 'replicad';
import { initOcct } from './occtBackend';
import {
  meshShape,
  meshFaceToGeometry,
  displayMeshOptions,
  COARSE_MESH_OPTIONS,
  DISPLAY_MAX_DEFLECTION,
  FINE_MESH_OPTIONS,
} from './meshing';

/** Total triangle count across all face geometries of a mesh result. */
function triCount(result: { faces: { indices: ArrayLike<number> }[] }): number {
  return result.faces.reduce((sum, f) => sum + f.indices.length / 3, 0);
}

beforeAll(async () => {
  await initOcct();
});

describe('displayMeshOptions', () => {
  it('keeps FINE for parts under ~400 mm', () => {
    expect(displayMeshOptions(replicad.makeBaseBox(100, 100, 100))).toBe(FINE_MESH_OPTIONS);
    expect(displayMeshOptions({})).toBe(FINE_MESH_OPTIONS);
  });

  it('scales the linear deflection with a large part and keeps the angular one', () => {
    const car = displayMeshOptions(replicad.makeBaseBox(4000, 1800, 1500));
    expect(car.angularTolerance).toBe(FINE_MESH_OPTIONS.angularTolerance);
    expect(car.tolerance).toBeGreaterThan(1);
    expect(car.tolerance).toBeLessThan(1.3);
    expect(displayMeshOptions(replicad.makeBaseBox(100_000, 1, 1)).tolerance).toBe(DISPLAY_MAX_DEFLECTION);
  });

  it('meshes a large curved part far coarser than FINE, a small one identically', () => {
    // Fresh shapes: OCCT keeps a finer triangulation it already has.
    const fine = meshShape(replicad.makeCylinder(1000, 2000), FINE_MESH_OPTIONS)!;
    const display = meshShape(replicad.makeCylinder(1000, 2000))!;
    const tris = (m: NonNullable<ReturnType<typeof meshShape>>) => m.faces.reduce((n, f) => n + f.indices.length / 3, 0);
    expect(tris(display)).toBeLessThan(tris(fine) / 2);
    expect(tris(meshShape(replicad.makeCylinder(5, 10))!))
      .toBe(tris(meshShape(replicad.makeCylinder(5, 10), FINE_MESH_OPTIONS)!));
  });
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

  it('one solid mesh matches per-face triangle counts', () => {
    const perShape = replicad.makeBaseBox(10, 20, 30);
    let perTris = 0;
    let perFaces = 0;
    perShape.faces.forEach((face, faceId) => {
      const geometry = meshFaceToGeometry(face, faceId, FINE_MESH_OPTIONS);
      if (!geometry) return;
      perFaces += 1;
      perTris += geometry.indices.length / 3;
    });
    const once = meshShape(replicad.makeBaseBox(10, 20, 30), FINE_MESH_OPTIONS);
    expect(once).not.toBeNull();
    expect(once!.faces).toHaveLength(perFaces);
    expect(triCount(once!)).toBe(perTris);

    const parts = [];
    for (let i = 0; i < 4; i++) parts.push(replicad.makeBaseBox(8, 8, 8).translate(i * 12, 0, 0));
    const compound = meshShape(replicad.compoundShapes(parts), FINE_MESH_OPTIONS);
    expect(compound).not.toBeNull();
    expect(compound!.faces).toHaveLength(24);
    expect(triCount(compound!)).toBeGreaterThan(0);
  });

  it('planar face axes match makePlaneFromFace', () => {
    const reference = replicad.makeBaseBox(10, 20, 30);
    const meshed = meshShape(replicad.makeBaseBox(10, 20, 30), FINE_MESH_OPTIONS);
    expect(meshed).not.toBeNull();
    reference.faces.forEach((face, i) => {
      const made = replicad.makePlaneFromFace(face);
      const plane = meshed!.faces[i]?.plane;
      expect(plane).toBeDefined();
      expect(plane!.normal[0]).toBeCloseTo(made.zDir.x, 5);
      expect(plane!.normal[1]).toBeCloseTo(made.zDir.y, 5);
      expect(plane!.normal[2]).toBeCloseTo(made.zDir.z, 5);
      expect(plane!.xDir![0]).toBeCloseTo(made.xDir.x, 5);
      expect(plane!.xDir![1]).toBeCloseTo(made.xDir.y, 5);
      expect(plane!.xDir![2]).toBeCloseTo(made.xDir.z, 5);
      expect(plane!.yDir![0]).toBeCloseTo(made.yDir.x, 5);
      expect(plane!.yDir![1]).toBeCloseTo(made.yDir.y, 5);
      expect(plane!.yDir![2]).toBeCloseTo(made.yDir.z, 5);
    });
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
