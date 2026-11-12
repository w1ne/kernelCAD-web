// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { Shape3D } from 'replicad';
import { TriangleBvh, type DfmMesh } from '../../modeling/runtime/dfm/meshBvh';
import type { MeshData } from '../../kernel/backends/occt/exportStlBinary';
import type { MeshDeviationReport } from '../../kernel/backends/occt/backendMesh';
import type { Vec3 } from '../../shared/intent/types';

// 4k capped samples keeps large multi-part manufacturing models measurable
// within the normal evaluator memory budget while matching the existing
// large-assembly export baseline.
export const MESH_DEVIATION_SAMPLE_CAP = 4_000;
/** A single BVH index is built at a time; peak index memory is independent of
 *  the export's total triangle count. */
export const MESH_DEVIATION_TRIANGLE_CHUNK_SIZE = 8_192;

type DeviationPoint = [number, number, number];
type TriangleMeshChunk = { vertices: ArrayLike<number>; triangles: ArrayLike<number> };

/** Read the triangles a binary STL actually stores (including Float32
 *  coordinate rounding) into the indexed mesh shape used by the BVH. */
export function decodeBinaryStlMesh(bytes: Uint8Array): MeshData {
  const { view, triangleCount } = readBinaryStl(bytes);
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

/** Lazily decode an STL into indexed meshes capped at `chunkSize` triangles. */
export function decodeBinaryStlMeshChunks(
  bytes: Uint8Array,
  chunkSize = MESH_DEVIATION_TRIANGLE_CHUNK_SIZE,
): Iterable<MeshData> {
  const { view, triangleCount } = readBinaryStl(bytes);
  validateTriangleChunkSize(chunkSize);
  return {
    *[Symbol.iterator](): Iterator<MeshData> {
      for (let start = 0; start < triangleCount; start += chunkSize) {
        const count = Math.min(chunkSize, triangleCount - start);
        const vertices = new Float32Array(count * 9);
        const triangles = new Uint32Array(count * 3);
        for (let localTriangle = 0; localTriangle < count; localTriangle++) {
          const recordOffset = 84 + (start + localTriangle) * 50;
          const vertexOffset = localTriangle * 9;
          for (let vertex = 0; vertex < 9; vertex++) {
            vertices[vertexOffset + vertex] = view.getFloat32(recordOffset + 12 + vertex * 4, true);
          }
          const triangleOffset = localTriangle * 3;
          triangles[triangleOffset] = localTriangle * 3;
          triangles[triangleOffset + 1] = localTriangle * 3 + 1;
          triangles[triangleOffset + 2] = localTriangle * 3 + 2;
        }
        yield { vertices, triangles };
      }
    },
  };
}

/**
 * Compare deterministic exact-surface samples from built B-reps against the
 * triangle soup sent to the format writer. Samples are projected to each
 * owning face; the result is a one-sided sampled measurement, not a certified
 * global maximum or a print-fit guarantee.
 */
export function measureBrepSurfaceDeviation(
  shapes: readonly Shape3D[],
  outputMeshes: readonly TriangleMeshChunk[],
  requestedMm: number,
  sampleCap = MESH_DEVIATION_SAMPLE_CAP,
): MeshDeviationReport {
  const triangleCount = outputMeshes.reduce((sum, mesh) => sum + Math.floor(mesh.triangles.length / 3), 0);
  if (outputMeshes.length === 0 || triangleCount === 0) {
    throw new Error('Mesh-deviation measurement needs at least one export triangle.');
  }

  const candidateCount = countBrepSamples(shapes);
  if (candidateCount === 0) throw new Error('Mesh-deviation measurement found no triangulated B-rep face samples.');
  const stride = Math.max(1, Math.ceil(candidateCount / Math.max(1, sampleCap)));
  const samplesByShape = collectBrepSamples(shapes, stride);
  const queries = outputMeshes.length === shapes.length
    ? samplesByShape.map((points, shapeIndex) => ({ points, meshes: [outputMeshes[shapeIndex]!] }))
    : [{ points: samplesByShape.flat(), meshes: outputMeshes }];
  const distances: number[] = [];
  for (const query of queries) {
    for (const distance of nearestTriangleDistancesChunked(query.points, query.meshes)) {
      if (Number.isFinite(distance)) distances.push(distance);
    }
  }
  return deviationReport(distances, triangleCount, requestedMm);
}

/** Measure a binary STL without materializing a decoded mesh for the whole export. */
export function measureBrepSurfaceDeviationFromBinaryStl(
  shapes: readonly Shape3D[],
  bytes: Uint8Array,
  requestedMm: number,
  sampleCap = MESH_DEVIATION_SAMPLE_CAP,
  chunkSize = MESH_DEVIATION_TRIANGLE_CHUNK_SIZE,
): MeshDeviationReport {
  validateTriangleChunkSize(chunkSize);
  const { triangleCount } = readBinaryStl(bytes);
  if (triangleCount === 0) throw new Error('Mesh-deviation measurement needs at least one export triangle.');
  const samples = collectDeterministicSamples(shapes, sampleCap);
  const distances = nearestTriangleDistancesFromChunks(
    samples,
    decodeBinaryStlMeshChunks(bytes, chunkSize),
  ).filter(Number.isFinite);
  return deviationReport(distances, triangleCount, requestedMm);
}

function collectDeterministicSamples(shapes: readonly Shape3D[], sampleCap: number): DeviationPoint[] {
  const candidateCount = countBrepSamples(shapes);
  if (candidateCount === 0) throw new Error('Mesh-deviation measurement found no triangulated B-rep face samples.');
  const stride = Math.max(1, Math.ceil(candidateCount / Math.max(1, sampleCap)));
  return collectBrepSamples(shapes, stride).flat();
}

function deviationReport(
  distances: number[],
  triangleCount: number,
  requestedMm: number,
): MeshDeviationReport {
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

/** Exact nearest distance for each point, scanning every triangle through
 *  bounded-size BVHs. The chunk-size override keeps cross-chunk behavior
 *  directly testable with small deterministic meshes. */
export function nearestTriangleDistancesChunked(
  points: readonly DeviationPoint[],
  meshes: readonly TriangleMeshChunk[],
  chunkSize = MESH_DEVIATION_TRIANGLE_CHUNK_SIZE,
): number[] {
  validateTriangleChunkSize(chunkSize);
  return nearestTriangleDistancesFromChunks(points, indexedTriangleChunks(meshes, chunkSize));
}

function nearestTriangleDistancesFromChunks(
  points: readonly DeviationPoint[],
  chunks: Iterable<TriangleMeshChunk>,
): number[] {
  const nearest = new Float64Array(points.length);
  nearest.fill(Infinity);
  for (const chunk of chunks) {
    const bvh = new TriangleBvh(chunk as unknown as DfmMesh);
    for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
      const hit = bvh.closestPoint(points[pointIndex]! as Vec3);
      if (hit && hit.distance < nearest[pointIndex]!) nearest[pointIndex] = hit.distance;
    }
  }
  return Array.from(nearest);
}

function* indexedTriangleChunks(meshes: readonly TriangleMeshChunk[], chunkSize: number): Iterable<TriangleMeshChunk> {
  for (const mesh of meshes) {
    const meshTriangleCount = Math.floor(mesh.triangles.length / 3);
    for (let start = 0; start < meshTriangleCount; start += chunkSize) {
      yield indexedTriangleChunk(mesh, start, Math.min(chunkSize, meshTriangleCount - start));
    }
  }
}

function validateTriangleChunkSize(chunkSize: number): void {
  if (!Number.isSafeInteger(chunkSize) || chunkSize < 1) {
    throw new Error('Mesh-deviation triangle chunk size must be a positive safe integer.');
  }
}

function readBinaryStl(bytes: Uint8Array): { view: DataView; triangleCount: number } {
  if (bytes.byteLength < 84) throw new Error('Binary STL is shorter than its header.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const triangleCount = view.getUint32(80, true);
  const expectedBytes = 84 + triangleCount * 50;
  if (bytes.byteLength < expectedBytes) {
    throw new Error(`Binary STL declares ${triangleCount} triangles but ends before byte ${expectedBytes}.`);
  }
  return { view, triangleCount };
}

function indexedTriangleChunk(mesh: TriangleMeshChunk, start: number, count: number): TriangleMeshChunk {
  const vertices = new Float64Array(count * 9);
  const triangles = new Uint32Array(count * 3);
  for (let triangle = 0; triangle < count; triangle++) {
    for (let corner = 0; corner < 3; corner++) {
      const source = mesh.triangles[(start + triangle) * 3 + corner]! * 3;
      const target = triangle * 9 + corner * 3;
      vertices[target] = mesh.vertices[source]!;
      vertices[target + 1] = mesh.vertices[source + 1]!;
      vertices[target + 2] = mesh.vertices[source + 2]!;
      triangles[triangle * 3 + corner] = triangle * 3 + corner;
    }
  }
  return { vertices, triangles };
}

function countBrepSamples(shapes: readonly Shape3D[]): number {
  let count = 0;
  for (const shape of shapes) {
    for (const face of shape.faces) {
      const tri = face.triangulation(0);
      if (tri) count += Math.floor(tri.trianglesIndexes.length / 3) * 4;
    }
  }
  return count;
}

function collectBrepSamples(shapes: readonly Shape3D[], stride: number): DeviationPoint[][] {
  const samplesByShape: DeviationPoint[][] = [];
  let candidate = 0;
  for (const shape of shapes) {
    const samples: DeviationPoint[] = [];
    for (const face of shape.faces) candidate = collectFaceSamples(face, candidate, stride, samples);
    samplesByShape.push(samples);
  }
  return samplesByShape;
}

function collectFaceSamples(
  face: Shape3D['faces'][number],
  candidateStart: number,
  stride: number,
  samples: DeviationPoint[],
): number {
  const tri = face.triangulation(0);
  if (!tri) return candidateStart;
  const { vertices, trianglesIndexes } = tri;
  let candidate = candidateStart;
  for (let i = 0; i + 2 < trianglesIndexes.length; i += 3) {
    const a = trianglesIndexes[i]! * 3;
    const b = trianglesIndexes[i + 1]! * 3;
    const c = trianglesIndexes[i + 2]! * 3;
    const points: DeviationPoint[] = [
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
        if (surfacePoint) samples.push(surfacePoint);
      }
      candidate++;
    }
  }
  return candidate;
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
