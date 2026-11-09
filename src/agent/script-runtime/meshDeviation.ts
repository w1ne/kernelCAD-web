// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { Shape3D } from 'replicad';
import { TriangleBvh, type DfmMesh } from '../../modeling/runtime/dfm/meshBvh';
import type { MeshData } from '../../kernel/backends/occt/exportStlBinary';
import type { MeshDeviationReport } from '../../kernel/backends/occt/backendMesh';

// 4k capped samples keeps large multi-part manufacturing models measurable
// within the normal evaluator memory budget while matching the existing
// large-assembly export baseline.
export const MESH_DEVIATION_SAMPLE_CAP = 4_000;

/** Read the triangles a binary STL actually stores (including Float32
 *  coordinate rounding) into the indexed mesh shape used by the BVH. */
export function decodeBinaryStlMesh(bytes: Uint8Array): MeshData {
  if (bytes.byteLength < 84) throw new Error('Binary STL is shorter than its header.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const triangleCount = view.getUint32(80, true);
  const expectedBytes = 84 + triangleCount * 50;
  if (bytes.byteLength < expectedBytes) {
    throw new Error(`Binary STL declares ${triangleCount} triangles but ends before byte ${expectedBytes}.`);
  }
  const vertices = new Float32Array(triangleCount * 9);
  const triangles = new Uint32Array(triangleCount * 3);
  let offset = 84;
  for (let tri = 0; tri < triangleCount; tri++) {
    offset += 12; // normal
    const vertexOffset = tri * 9;
    const triangleOffset = tri * 3;
    for (let i = 0; i < 9; i++) vertices[vertexOffset + i] = view.getFloat32(offset + i * 4, true);
    triangles[triangleOffset] = tri * 3;
    triangles[triangleOffset + 1] = tri * 3 + 1;
    triangles[triangleOffset + 2] = tri * 3 + 2;
    offset += 38; // vertices plus the 2-byte attribute count
  }
  return { vertices, triangles };
}

/**
 * Compare deterministic exact-surface samples from built B-reps against the
 * triangle soup sent to the format writer. Samples are projected to each
 * owning face; the result is a one-sided sampled measurement, not a certified
 * global maximum or a print-fit guarantee.
 */
export function measureBrepSurfaceDeviation(
  shapes: readonly Shape3D[],
  outputMeshes: readonly MeshData[],
  requestedMm: number,
  sampleCap = MESH_DEVIATION_SAMPLE_CAP,
): MeshDeviationReport {
  const indexes = outputMeshes.map((mesh) => new TriangleBvh(mesh as DfmMesh));
  const triangleCount = outputMeshes.reduce((sum, mesh) => sum + Math.floor(mesh.triangles.length / 3), 0);
  if (indexes.length === 0 || indexes.every(index => index.triangleCount === 0)) {
    throw new Error('Mesh-deviation measurement needs at least one export triangle.');
  }

  let candidateCount = 0;
  for (const shape of shapes) {
    for (const face of shape.faces) {
      const tri = face.triangulation(0);
      if (tri) candidateCount += Math.floor(tri.trianglesIndexes.length / 3) * 4;
    }
  }
  if (candidateCount === 0) throw new Error('Mesh-deviation measurement found no triangulated B-rep face samples.');
  const stride = Math.max(1, Math.ceil(candidateCount / Math.max(1, sampleCap)));
  const distances: number[] = [];
  let candidate = 0;

  for (let shapeIndex = 0; shapeIndex < shapes.length; shapeIndex++) {
    const shape = shapes[shapeIndex]!;
    // Multi-object formats keep one mesh per input part; compare each B-rep
    // only with its own serialized mesh. A single fused STL triangle soup is
    // shared across all source shapes and is indexed as one candidate set.
    const candidateIndexes = outputMeshes.length === shapes.length
      ? [indexes[shapeIndex]!]
      : indexes;
    for (const face of shape.faces) {
      const tri = face.triangulation(0);
      if (!tri) continue;
      const vertices = tri.vertices;
      const indices = tri.trianglesIndexes;
      for (let i = 0; i + 2 < indices.length; i += 3) {
        const a = indices[i]! * 3;
        const b = indices[i + 1]! * 3;
        const c = indices[i + 2]! * 3;
        const points: Array<[number, number, number]> = [
          midpoint(vertices, a, b),
          midpoint(vertices, b, c),
          midpoint(vertices, c, a),
          [
            (vertices[a]! + vertices[b]! + vertices[c]!) / 3,
            (vertices[a + 1]! + vertices[b + 1]! + vertices[c + 1]!) / 3,
            (vertices[a + 2]! + vertices[b + 2]! + vertices[c + 2]!) / 3,
          ],
        ];
        for (const point of points) {
          if (candidate % stride === 0) {
            const surfacePoint = projectToFace(face, point);
            if (surfacePoint) {
              let nearest = Infinity;
              for (const index of candidateIndexes) {
                const hit = index.closestPoint(surfacePoint);
                if (hit && hit.distance < nearest) nearest = hit.distance;
              }
              if (Number.isFinite(nearest)) distances.push(nearest);
            }
          }
          candidate++;
        }
      }
    }
  }
  if (distances.length === 0) throw new Error('Mesh-deviation measurement could not project any B-rep samples onto their owning faces.');
  distances.sort((a, b) => a - b);
  return {
    requested_mm: requestedMm,
    measured_max_mm: distances[distances.length - 1]!,
    measured_p95_mm: distances[Math.max(0, Math.ceil(distances.length * 0.95) - 1)]!,
    samples: distances.length,
    triangles: triangleCount,
    measurement: 'sampled_brep_surface_to_export_triangles',
    global_max_certified: false,
  };
}

function midpoint(vertices: readonly number[], a: number, b: number): [number, number, number] {
  return [
    (vertices[a]! + vertices[b]!) / 2,
    (vertices[a + 1]! + vertices[b + 1]!) / 2,
    (vertices[a + 2]! + vertices[b + 2]!) / 2,
  ];
}

function projectToFace(
  face: Shape3D['faces'][number],
  point: [number, number, number],
): [number, number, number] | undefined {
  try {
    const uv = face.uvCoordinates(point);
    const bounds = face.UVBounds;
    const du = bounds.uMax - bounds.uMin;
    const dv = bounds.vMax - bounds.vMin;
    if (!(du > 0) || !(dv > 0)) return undefined;
    const exact = face.pointOnSurface((uv[0] - bounds.uMin) / du, (uv[1] - bounds.vMin) / dv);
    if (![exact.x, exact.y, exact.z].every(Number.isFinite)) return undefined;
    return [exact.x, exact.y, exact.z];
  } catch {
    return undefined;
  }
}
