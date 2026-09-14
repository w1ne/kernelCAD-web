// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/reconstruct/meshClean.ts
//
// Turn a raw triangle soup into an indexed, analysable mesh and say honestly
// what it is: weld coincident corners, drop degenerate and duplicate
// triangles, keep the largest connected shell, fix the global orientation by
// the sign of the enclosed volume, and report watertightness with the same
// edge-use predicate the STL exporter's verify gate applies
// (`verifyWatertight`).

import { verifyWatertight, type CrackCluster } from '../../kernel/backends/occt/meshHeal';
import type { TriangleSoup } from './meshIO';
import type { V3 } from './geom';

export interface IndexedMesh {
  /** 3 per vertex. */
  positions: Float64Array;
  /** 3 per triangle, CCW = outward after orientation repair. */
  triangles: Uint32Array;
  /** Unit normal per triangle (3 each). */
  normals: Float64Array;
  /** Area per triangle. */
  areas: Float64Array;
  /** Neighbour triangle across edge k (edge k = vertex k → vertex k+1), −1 when
   *  the edge is open or non-manifold. 3 per triangle. */
  neighbors: Int32Array;
  bbox: { min: V3; max: V3 };
}

export interface MeshReport {
  format: TriangleSoup['format'];
  inputTriangles: number;
  vertices: number;
  triangles: number;
  weldToleranceMm: number;
  droppedDegenerate: number;
  droppedDuplicate: number;
  /** Connected shells found; only the largest is analysed. */
  shells: number;
  /** Every edge used by exactly two triangles, in opposite directions. */
  watertight: boolean;
  openEdges: number;
  nonManifoldEdges: number;
  /** Manifold edges whose two triangles traverse them in the same direction. */
  inconsistentEdges: number;
  /** True when the whole shell was inverted (negative enclosed volume) and flipped. */
  orientationFlipped: boolean;
  /** Largest crack clusters reported by the exporter's watertight verifier. */
  crackClusters: CrackCluster[];
  volumeMm3: number;
  surfaceAreaMm2: number;
  bbox: { min: V3; max: V3 };
}

export interface CleanOptions {
  /** Vertex weld distance in mm. Default max(1e-4, 1e-6 × bbox diagonal). */
  weldToleranceMm?: number;
}

export function cleanMesh(soup: TriangleSoup, opts: CleanOptions = {}): { mesh: IndexedMesh; report: MeshReport } {
  const src = soup.positions;
  const inputTriangles = Math.floor(src.length / 9);
  const rawBox = boundsOf(src);
  const diag = Math.hypot(rawBox.max[0] - rawBox.min[0], rawBox.max[1] - rawBox.min[1], rawBox.max[2] - rawBox.min[2]);
  const tol = opts.weldToleranceMm ?? Math.max(1e-4, 1e-6 * diag);

  // --- weld (spatial hash with 27-cell neighbourhood) -----------------------
  const cells = new Map<string, number[]>();
  const verts: number[] = [];
  const remap = new Uint32Array(inputTriangles * 3);
  const inv = 1 / tol;
  for (let c = 0; c < inputTriangles * 3; c++) {
    const x = src[c * 3], y = src[c * 3 + 1], z = src[c * 3 + 2];
    const ix = Math.floor(x * inv), iy = Math.floor(y * inv), iz = Math.floor(z * inv);
    let found = -1;
    for (let dx = -1; dx <= 1 && found < 0; dx++) {
      for (let dy = -1; dy <= 1 && found < 0; dy++) {
        for (let dz = -1; dz <= 1 && found < 0; dz++) {
          const bucket = cells.get(`${ix + dx},${iy + dy},${iz + dz}`);
          if (!bucket) continue;
          for (const vi of bucket) {
            const ddx = verts[vi * 3] - x, ddy = verts[vi * 3 + 1] - y, ddz = verts[vi * 3 + 2] - z;
            if (ddx * ddx + ddy * ddy + ddz * ddz <= tol * tol) {
              found = vi;
              break;
            }
          }
        }
      }
    }
    if (found < 0) {
      found = verts.length / 3;
      verts.push(x, y, z);
      const key = `${ix},${iy},${iz}`;
      const bucket = cells.get(key);
      if (bucket) bucket.push(found);
      else cells.set(key, [found]);
    }
    remap[c] = found;
  }

  // --- drop degenerate + duplicate triangles --------------------------------
  let droppedDegenerate = 0;
  let droppedDuplicate = 0;
  const seen = new Set<string>();
  const kept: number[] = [];
  const minArea = tol * tol * 1e-3;
  for (let t = 0; t < inputTriangles; t++) {
    const a = remap[t * 3], b = remap[t * 3 + 1], c = remap[t * 3 + 2];
    if (a === b || b === c || a === c || triArea(verts, a, b, c) <= minArea) {
      droppedDegenerate++;
      continue;
    }
    const key = [a, b, c].sort((p, q) => p - q).join(',');
    if (seen.has(key)) {
      droppedDuplicate++;
      continue;
    }
    seen.add(key);
    kept.push(a, b, c);
  }

  // --- shells: union-find over shared edges --------------------------------
  const triCount0 = kept.length / 3;
  const parent = new Int32Array(triCount0).map((_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const edgeOwner = new Map<number, number>();
  const vCount = verts.length / 3;
  for (let t = 0; t < triCount0; t++) {
    for (let k = 0; k < 3; k++) {
      const u = kept[t * 3 + k], v = kept[t * 3 + ((k + 1) % 3)];
      const key = u < v ? u * vCount + v : v * vCount + u;
      const other = edgeOwner.get(key);
      if (other === undefined) edgeOwner.set(key, t);
      else {
        const ra = find(t), rb = find(other);
        if (ra !== rb) parent[ra] = rb;
      }
    }
  }
  const shellArea = new Map<number, number>();
  for (let t = 0; t < triCount0; t++) {
    const r = find(t);
    shellArea.set(r, (shellArea.get(r) ?? 0) + triArea(verts, kept[t * 3], kept[t * 3 + 1], kept[t * 3 + 2]));
  }
  let bestShell = -1;
  let bestArea = -1;
  for (const [r, a] of shellArea) {
    if (a > bestArea) {
      bestArea = a;
      bestShell = r;
    }
  }

  // --- compact to the kept shell -------------------------------------------
  const vMap = new Int32Array(vCount).fill(-1);
  const outVerts: number[] = [];
  const outTris: number[] = [];
  for (let t = 0; t < triCount0; t++) {
    if (find(t) !== bestShell) continue;
    for (let k = 0; k < 3; k++) {
      const v = kept[t * 3 + k];
      if (vMap[v] < 0) {
        vMap[v] = outVerts.length / 3;
        outVerts.push(verts[v * 3], verts[v * 3 + 1], verts[v * 3 + 2]);
      }
      outTris.push(vMap[v]);
    }
  }
  const positions = Float64Array.from(outVerts);
  const triangles = Uint32Array.from(outTris);
  const triCount = triangles.length / 3;

  // --- orientation by enclosed volume ---------------------------------------
  let volume6 = 0;
  for (let t = 0; t < triCount; t++) {
    const a = triangles[t * 3] * 3, b = triangles[t * 3 + 1] * 3, c = triangles[t * 3 + 2] * 3;
    volume6 +=
      positions[a] * (positions[b + 1] * positions[c + 2] - positions[b + 2] * positions[c + 1]) -
      positions[a + 1] * (positions[b] * positions[c + 2] - positions[b + 2] * positions[c]) +
      positions[a + 2] * (positions[b] * positions[c + 1] - positions[b + 1] * positions[c]);
  }
  const orientationFlipped = volume6 < 0;
  if (orientationFlipped) {
    for (let t = 0; t < triCount; t++) {
      const tmp = triangles[t * 3 + 1];
      triangles[t * 3 + 1] = triangles[t * 3 + 2];
      triangles[t * 3 + 2] = tmp;
    }
  }

  // --- normals, areas, adjacency, edge report --------------------------------
  const normals = new Float64Array(triCount * 3);
  const areas = new Float64Array(triCount);
  let surfaceArea = 0;
  for (let t = 0; t < triCount; t++) {
    const a = triangles[t * 3] * 3, b = triangles[t * 3 + 1] * 3, c = triangles[t * 3 + 2] * 3;
    const e1x = positions[b] - positions[a], e1y = positions[b + 1] - positions[a + 1], e1z = positions[b + 2] - positions[a + 2];
    const e2x = positions[c] - positions[a], e2y = positions[c + 1] - positions[a + 1], e2z = positions[c + 2] - positions[a + 2];
    const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const len = Math.hypot(nx, ny, nz);
    areas[t] = len / 2;
    surfaceArea += len / 2;
    if (len > 0) {
      normals[t * 3] = nx / len;
      normals[t * 3 + 1] = ny / len;
      normals[t * 3 + 2] = nz / len;
    }
  }
  const outVCount = positions.length / 3;
  const edgeUses = new Map<number, number[]>();
  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) {
      const u = triangles[t * 3 + k], v = triangles[t * 3 + ((k + 1) % 3)];
      const key = u < v ? u * outVCount + v : v * outVCount + u;
      const list = edgeUses.get(key);
      if (list) list.push(t * 3 + k);
      else edgeUses.set(key, [t * 3 + k]);
    }
  }
  const neighbors = new Int32Array(triCount * 3).fill(-1);
  let openEdges = 0;
  let nonManifoldEdges = 0;
  let inconsistentEdges = 0;
  for (const uses of edgeUses.values()) {
    if (uses.length === 1) {
      openEdges++;
      continue;
    }
    if (uses.length > 2) {
      nonManifoldEdges++;
      continue;
    }
    const [e0, e1] = uses;
    const t0 = Math.floor(e0 / 3), k0 = e0 % 3, t1 = Math.floor(e1 / 3), k1 = e1 % 3;
    const u0 = triangles[t0 * 3 + k0];
    const u1 = triangles[t1 * 3 + k1];
    if (u0 === u1) inconsistentEdges++;
    neighbors[e0] = t1;
    neighbors[e1] = t0;
  }
  const watertight = openEdges === 0 && nonManifoldEdges === 0 && inconsistentEdges === 0;
  const crackClusters = watertight
    ? []
    : verifyWatertight({ vertices: Float32Array.from(positions), triangles }).clusters;

  const bbox = boundsOf(positions, 3);
  return {
    mesh: { positions, triangles, normals, areas, neighbors, bbox },
    report: {
      format: soup.format,
      inputTriangles,
      vertices: outVCount,
      triangles: triCount,
      weldToleranceMm: tol,
      droppedDegenerate,
      droppedDuplicate,
      shells: shellArea.size,
      watertight,
      openEdges,
      nonManifoldEdges,
      inconsistentEdges,
      orientationFlipped,
      crackClusters,
      volumeMm3: Math.abs(volume6) / 6,
      surfaceAreaMm2: surfaceArea,
      bbox,
    },
  };
}

function triArea(v: ArrayLike<number>, a: number, b: number, c: number): number {
  const e1x = v[b * 3] - v[a * 3], e1y = v[b * 3 + 1] - v[a * 3 + 1], e1z = v[b * 3 + 2] - v[a * 3 + 2];
  const e2x = v[c * 3] - v[a * 3], e2y = v[c * 3 + 1] - v[a * 3 + 1], e2z = v[c * 3 + 2] - v[a * 3 + 2];
  return Math.hypot(e1y * e2z - e1z * e2y, e1z * e2x - e1x * e2z, e1x * e2y - e1y * e2x) / 2;
}

function boundsOf(p: ArrayLike<number>, stride = 3): { min: V3; max: V3 } {
  const min: V3 = [Infinity, Infinity, Infinity];
  const max: V3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i + 2 < p.length; i += stride) {
    for (let k = 0; k < 3; k++) {
      if (p[i + k] < min[k]) min[k] = p[i + k];
      if (p[i + k] > max[k]) max[k] = p[i + k];
    }
  }
  if (min[0] === Infinity) return { min: [0, 0, 0], max: [0, 0, 0] };
  return { min, max };
}
