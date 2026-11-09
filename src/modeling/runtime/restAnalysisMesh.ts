// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Cached world-space analysis meshes for required rest-pose checks.
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { OcctBackend, analysisBodyOf } from '../../kernel/backends/occt/occtBackend';
import type { Transform } from '../../shared/runtime/se3';
import { TriangleBvh } from './dfm/meshBvh';

export interface WorldMesh {
  /** Mesh volume agrees with BREP volume; topology is checked separately. */
  readonly closed: boolean;
  readonly positions: Float64Array;
  readonly indices: Uint32Array;
  readonly min: [number, number, number];
  readonly max: [number, number, number];
}

export function worldMesh(shape: OcctBackend, worldTransform: Transform): WorldMesh | undefined {
  let mesh;
  try {
    mesh = shape.getMesh();
  } catch {
    return undefined;
  }
  const n = mesh.positions.length / 3;
  if (n === 0 || mesh.indices.length === 0) return undefined;
  const positions = new Float64Array(n * 3);
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) {
    const p = worldTransform.point([mesh.positions[3 * i], mesh.positions[3 * i + 1], mesh.positions[3 * i + 2]]);
    for (let k = 0; k < 3; k++) {
      positions[3 * i + k] = p[k];
      if (p[k] < min[k]) min[k] = p[k];
      if (p[k] > max[k]) max[k] = p[k];
    }
  }
  // Divergence-theorem volume of the triangles against the BREP volume. A
  // face the mesher dropped (complex toothed faces sometimes do) leaves a
  // hole that ray parity would read as solid; such a part is measured with
  // the BREP boolean instead.
  let six = 0;
  const I = mesh.indices;
  for (let t = 0; t < I.length; t += 3) {
    const a = 3 * I[t], b = 3 * I[t + 1], c = 3 * I[t + 2];
    six += positions[a] * (positions[b + 1] * positions[c + 2] - positions[b + 2] * positions[c + 1])
      - positions[a + 1] * (positions[b] * positions[c + 2] - positions[b + 2] * positions[c])
      + positions[a + 2] * (positions[b] * positions[c + 1] - positions[b + 1] * positions[c]);
  }
  let brep = NaN;
  try {
    brep = shape.volume();
  } catch {
    // keep NaN: treated as not closed
  }
  const closed = Number.isFinite(brep) && Math.abs(Math.abs(six / 6) - Math.abs(brep)) <= 0.005 * Math.abs(brep) + 1;
  return { closed, positions, indices: mesh.indices, min, max };
}

export interface RestAnalysisMesh {
  readonly mesh: WorldMesh;
}

type RestBodySource = 'shape' | 'analysis';
type CachedRestMesh = RestAnalysisMesh & { bvh?: TriangleBvh | null };
const cache = new WeakMap<SceneBackend['parts'][number], WeakMap<OcctBackend, CachedRestMesh | null>>();

/** One world mesh per selected lowered body. BVH packing is deferred. */
export function restWorldMesh(part: SceneBackend['parts'][number], source: RestBodySource): RestAnalysisMesh | undefined {
  if (!(part.shape instanceof OcctBackend)) return undefined;
  const body = source === 'shape' ? part.shape : analysisBodyOf(part.shape) as OcctBackend;
  let byBody = cache.get(part);
  if (byBody === undefined) {
    byBody = new WeakMap();
    cache.set(part, byBody);
  }
  if (byBody.has(body)) return byBody.get(body) ?? undefined;
  const mesh = worldMesh(body, part.worldTransform);
  const result = mesh === undefined ? undefined : { mesh };
  byBody.set(body, result ?? null);
  return result;
}

/** Read a rest-check mesh without triggering another analysis tessellation. */
export function cachedRestWorldMesh(part: SceneBackend['parts'][number], source: RestBodySource): RestAnalysisMesh | undefined {
  if (!(part.shape instanceof OcctBackend)) return undefined;
  const body = source === 'shape' ? part.shape : analysisBodyOf(part.shape) as OcctBackend;
  return cache.get(part)?.get(body) ?? undefined;
}

/** Coordinate-welded edge incidence: every edge must belong to two faces.
 *  A 1 nm coordinate grid joins duplicated OCCT face-boundary vertices. */
function weldMeshVertices(positions: WorldMesh['positions']): Int32Array | undefined {
  const welded = new Int32Array(positions.length / 3);
  const ids = new Map<string, number>();
  for (let i = 0; i < welded.length; i++) {
    const x = positions[3 * i], y = positions[3 * i + 1], z = positions[3 * i + 2];
    if (![x, y, z].every(Number.isFinite)) return undefined;
    const key = `${Math.round(x * 1e6)},${Math.round(y * 1e6)},${Math.round(z * 1e6)}`;
    let id = ids.get(key);
    if (id === undefined) { id = ids.size; ids.set(key, id); }
    welded[i] = id;
  }
  return welded;
}

function manifoldClosedEdges(indices: WorldMesh['indices'], welded: Int32Array): boolean {
  const edges = new Map<string, number>();
  for (let t = 0; t < indices.length; t += 3) {
    if (indices[t] >= welded.length || indices[t + 1] >= welded.length || indices[t + 2] >= welded.length) return false;
    const a = welded[indices[t]], b = welded[indices[t + 1]], c = welded[indices[t + 2]];
    if (a === b || b === c || c === a) return false;
    for (const [u, v] of [[a, b], [b, c], [c, a]]) {
      const key = u < v ? `${u},${v}` : `${v},${u}`;
      const count = (edges.get(key) ?? 0) + 1;
      if (count > 2) return false;
      edges.set(key, count);
    }
  }
  for (const count of edges.values()) if (count !== 2) return false;
  return true;
}

export function watertightWorldMesh(mesh: WorldMesh): boolean {
  const { positions: P, indices: I } = mesh;
  if (!mesh.closed || P.length % 3 !== 0 || I.length % 3 !== 0 || I.length === 0) return false;
  const welded = weldMeshVertices(P);
  return welded !== undefined && manifoldClosedEdges(I, welded);
}

/** Build a proximity BVH only if this body's mesh supports parity. */
export function restMeshBvh(part: SceneBackend['parts'][number], source: RestBodySource): TriangleBvh | undefined {
  const entry = restWorldMesh(part, source) as CachedRestMesh | undefined;
  if (entry === undefined) return undefined;
  if (entry.bvh !== undefined) return entry.bvh ?? undefined;
  entry.bvh = null;
  if (!watertightWorldMesh(entry.mesh)) return undefined;
  try {
    const bvh = new TriangleBvh({ vertices: entry.mesh.positions, triangles: entry.mesh.indices });
    if (bvh.triangleCount === entry.mesh.indices.length / 3) entry.bvh = bvh;
  } catch { /* Invalid mesh: retain the exact BREP path. */ }
  return entry.bvh ?? undefined;
}

export interface RestMeshContact {
  readonly distanceMm: number;
  readonly pointA: readonly [number, number, number];
  readonly pointB: readonly [number, number, number];
  readonly contained: boolean;
}

/** Mesh surface distance, with nested closed solids counted as contact. */
export function restMeshContact(
  a: SceneBackend['parts'][number],
  b: SceneBackend['parts'][number],
  source: RestBodySource,
): RestMeshContact | undefined {
  const A = restMeshBvh(a, source);
  const B = restMeshBvh(b, source);
  if (A === undefined || B === undefined) return undefined;
  const pair = A.closestPoints(B);
  if (pair === null) return undefined;
  const contained = pair.distance > 0 && (B.pointInside(pair.pointA) || A.pointInside(pair.pointB));
  return { distanceMm: contained ? 0 : pair.distance, pointA: pair.pointA, pointB: pair.pointB, contained };
}
