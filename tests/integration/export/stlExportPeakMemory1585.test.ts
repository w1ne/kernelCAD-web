// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// #1585: STL export of a dense part pushed the evaluator past its 1024 MB cap.
// The wasm heap was small; the memory went to per-node and per-triangle JS
// objects in the mesh read-back, the vertex weld and the edge-use maps. This
// file runs in its own worker process, so its peak RSS is its own.
import { beforeAll, describe, expect, it } from 'vitest';
import { compoundShapes, type Face, type Shape3D } from 'replicad';
import { initOcct, meshShapeForExport, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { encodeBinaryStlBytes } from '../../../src/kernel/backends/occt/exportStlBinary';
import { stitchCracks, verifyWatertight, dropDegenerateTriangles } from '../../../src/kernel/backends/occt/meshHeal';
import { cleanupExportMesh } from '../../../src/kernel/backends/occt/meshCleanup';

beforeAll(async () => {
  await initOcct();
}, 60_000);

const peakRssMb = (): number => process.resourceUsage().maxRSS / 1024;

/** The read-back and weld as they were before #1585: replicad's
 *  `Face.triangulation()` and a string-keyed vertex map. */
function referenceMesh(shape: Shape3D): { vertices: number[]; triangles: number[] } {
  const rawVertices: number[] = [];
  const rawTriangles: number[] = [];
  for (const face of shape.faces as Face[]) {
    const tri = face.triangulation(rawVertices.length / 3);
    if (!tri) continue;
    for (const t of tri.trianglesIndexes) rawTriangles.push(t);
    for (const v of tri.vertices) rawVertices.push(v);
  }
  const canonical = new Map<string, number>();
  const vertices: number[] = [];
  const remap: number[] = [];
  for (let i = 0; i < rawVertices.length; i += 3) {
    const x = rawVertices[i], y = rawVertices[i + 1], z = rawVertices[i + 2];
    const key = `${Math.round(x * 1e7)},${Math.round(y * 1e7)},${Math.round(z * 1e7)}`;
    let idx = canonical.get(key);
    if (idx === undefined) {
      idx = vertices.length / 3;
      vertices.push(x, y, z);
      canonical.set(key, idx);
    }
    remap.push(idx);
  }
  const mesh = { vertices, triangles: dropDegenerateTriangles(rawTriangles.map(t => remap[t])) };
  stitchCracks(mesh, 0.05);
  mesh.triangles = dropDegenerateTriangles(mesh.triangles);
  cleanupExportMesh(mesh);
  return mesh;
}

describe('STL export peak memory (#1585)', () => {
  it('meshes a moved, drilled part to the same vertices and triangles as the replicad read-back', () => {
    const body = OcctBackend.box(40, 30, 12)
      .union(OcctBackend.sphere(9).translate(20, 15, 12))
      .subtract(OcctBackend.cylinder(40, 3).translate(10, 10, -5))
      .rotate([0, 0, 1], 33, [1, 2, 3])
      .translate(7.25, -3.5, 11.125);
    const shape = body.getReplicadShape();
    const mesh = meshShapeForExport(shape);
    expect(mesh.triangles.length).toBeGreaterThan(3000);
    expect(verifyWatertight(mesh).ok).toBe(true);
    // The triangulation meshShapeForExport left on the faces is what the
    // reference reads.
    const reference = referenceMesh(shape);
    expect(mesh.vertices).toEqual(reference.vertices);
    expect(mesh.triangles).toEqual(reference.triangles);
  });

  it('exports a 600k-triangle part within 300 MB of extra peak RSS', () => {
    // 20 separate spheres in one compound: dense, and no boolean to wait for.
    const spheres = Array.from({ length: 20 }, (_, i) =>
      OcctBackend.sphere(10).translate((i % 5) * 25, Math.floor(i / 5) * 25, 0).getReplicadShape());
    const part = compoundShapes(spheres) as unknown as Shape3D;
    const before = peakRssMb();
    const mesh = meshShapeForExport(part);
    if (process.env.KCAD_STL_MEMORY_EVIDENCE === '1') {
      console.log(`STL_MEMORY_STAGE after-mesh=${peakRssMb().toFixed(2)} MB`);
    }
    const report = verifyWatertight(mesh);
    if (process.env.KCAD_STL_MEMORY_EVIDENCE === '1') {
      console.log(`STL_MEMORY_STAGE after-verify=${peakRssMb().toFixed(2)} MB`);
    }
    const bytes = encodeBinaryStlBytes(mesh);
    const peakAfter = peakRssMb();
    const grewMb = peakAfter - before;
    const triangles = mesh.triangles.length / 3;
    if (process.env.KCAD_STL_MEMORY_EVIDENCE === '1') {
      console.log(`STL_MEMORY_STAGE after-encode=${peakAfter.toFixed(2)} MB`);
      console.log(`STL_MEMORY_EVIDENCE baseline=${before.toFixed(2)} MB peak=${peakAfter.toFixed(2)} MB delta=${grewMb.toFixed(2)} MB triangles=${triangles}`);
    }
    expect(triangles).toBeGreaterThan(600_000);
    expect(report.ok).toBe(true);
    expect(bytes.byteLength).toBe(84 + triangles * 50);
    expect(new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(80, true)).toBe(triangles);
    // Three isolated Node 24.22.2 runs after #1773 changes measured 281.28,
    // 282.14 and 288.02 MB. Keep this budget below the CI failure threshold.
    expect(grewMb, `peak RSS grew ${grewMb.toFixed(0)} MB for ${triangles} triangles`).toBeLessThan(300);
  });
});
