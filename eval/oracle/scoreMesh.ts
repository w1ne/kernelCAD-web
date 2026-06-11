// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/oracle/scoreMesh.ts
//
// 3D-geometric scorer comparing two STL meshes.
//
// Computes:
//   * Chamfer distance — mean of nearest-neighbor distances between two point
//     clouds (both directions, averaged). Lower = more similar geometry.
//     Robust to point-cloud size differences. Reported in mesh units (mm
//     for kernelCAD exports).
//   * Hausdorff distance — max of nearest-neighbor distances. Lower = no
//     "outlier" surface deviations. Reported as p99 (top-1% of distances)
//     to suppress sampling noise.
//   * Bbox volume IoU — overlap of axis-aligned bounding boxes. Coarse but
//     gameable-resistant (you can't inflate a body depth past the reference
//     and still score well, unlike the silhouette-IoU scorer).
//
// Why this exists:
//   The 2D-pixel scorer (scoreRenderVsReference) was empirically gameable
//   at multiple levels — Round 5/6 agent eval showed agents inflating body
//   depth (R5) or leaving lens cuts disconnected (R16 iter-1) for higher
//   silhouette IoU against the photo, despite producing non-glasses-shaped
//   geometry. 3D geometric comparison has no render noise; "did you build
//   the right shape?" becomes binary.
//
// Implementation notes:
//   * Binary STL parser (80-byte header + uint32 count + N × 50-byte
//     triangles). Pure Node, no external deps.
//   * Brute-force nearest-neighbor for vertex-cloud comparison. O(N×M).
//     Adequate for meshes < 50k vertices each (cqe-scale parts run in
//     ~1 second). For larger meshes, a KD-tree would help; deferred until
//     a real eval task needs it.

import { readFileSync, existsSync } from 'node:fs';

export interface MeshScoreResult {
  /** Mean nearest-neighbor distance, both directions averaged. Lower = better. mm. */
  chamferDistance: number;
  /** 99th-percentile of nearest-neighbor distances. Suppresses outlier noise. mm. */
  hausdorff99p: number;
  /** Axis-aligned bbox intersection / union. [0,1], 1 = identical bboxes. */
  bboxIoU: number;
  /** Reference STL bbox volume in mm^3. */
  referenceBboxVolume: number;
  /** Generated STL bbox volume in mm^3. */
  generatedBboxVolume: number;
  /** Number of triangles in the reference STL. */
  referenceTriangles: number;
  /** Number of triangles in the generated STL. */
  generatedTriangles: number;
}

interface ParsedSTL {
  vertices: Float32Array; // flat [x0,y0,z0, x1,y1,z1, ...] one per triangle vertex (3 per triangle)
  triangleCount: number;
  bbox: { min: [number, number, number]; max: [number, number, number] };
}

function parseBinarySTL(buf: Buffer): ParsedSTL {
  if (buf.length < 84) {
    throw new Error(`scoreMesh: STL too short (${buf.length} bytes) — not a binary STL.`);
  }
  const triangleCount = buf.readUInt32LE(80);
  const expectedSize = 84 + triangleCount * 50;
  if (buf.length < expectedSize) {
    throw new Error(`scoreMesh: STL truncated (claims ${triangleCount} tris, expected ${expectedSize} bytes, got ${buf.length}).`);
  }
  const vertices = new Float32Array(triangleCount * 9);
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let t = 0; t < triangleCount; t++) {
    const triOffset = 84 + t * 50;
    // 12 bytes normal, then 36 bytes (3 verts × 3 floats × 4 bytes), then 2-byte attribute.
    for (let v = 0; v < 3; v++) {
      const vOffset = triOffset + 12 + v * 12;
      const x = buf.readFloatLE(vOffset);
      const y = buf.readFloatLE(vOffset + 4);
      const z = buf.readFloatLE(vOffset + 8);
      vertices[t * 9 + v * 3 + 0] = x;
      vertices[t * 9 + v * 3 + 1] = y;
      vertices[t * 9 + v * 3 + 2] = z;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
  }
  return {
    vertices,
    triangleCount,
    bbox: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] },
  };
}

function loadSTL(path: string): ParsedSTL {
  if (!existsSync(path)) {
    throw new Error(`scoreMesh: STL not found: ${path}`);
  }
  return parseBinarySTL(readFileSync(path));
}

/** Sample N points from the per-triangle vertex array (one vertex per triangle, modulo N). */
function samplePoints(stl: ParsedSTL, maxPoints: number): Float32Array {
  const vertCount = stl.triangleCount * 3;
  if (vertCount <= maxPoints) return stl.vertices;
  const step = Math.ceil(vertCount / maxPoints);
  const sampled = new Float32Array(Math.ceil(vertCount / step) * 3);
  let outIdx = 0;
  for (let i = 0; i < vertCount; i += step) {
    sampled[outIdx * 3 + 0] = stl.vertices[i * 3 + 0];
    sampled[outIdx * 3 + 1] = stl.vertices[i * 3 + 1];
    sampled[outIdx * 3 + 2] = stl.vertices[i * 3 + 2];
    outIdx++;
  }
  return sampled.subarray(0, outIdx * 3);
}

/** For each point in `a`, find distance to nearest point in `b`. Returns sorted distances. */
function nearestNeighborDistances(a: Float32Array, b: Float32Array): Float32Array {
  const nA = a.length / 3;
  const nB = b.length / 3;
  const dists = new Float32Array(nA);
  for (let i = 0; i < nA; i++) {
    const ax = a[i * 3], ay = a[i * 3 + 1], az = a[i * 3 + 2];
    let best = Infinity;
    for (let j = 0; j < nB; j++) {
      const dx = ax - b[j * 3];
      const dy = ay - b[j * 3 + 1];
      const dz = az - b[j * 3 + 2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < best) best = d2;
    }
    dists[i] = Math.sqrt(best);
  }
  return dists;
}

function bboxIoU(ref: ParsedSTL, gen: ParsedSTL): { iou: number; refVol: number; genVol: number } {
  const refVol = (ref.bbox.max[0] - ref.bbox.min[0]) * (ref.bbox.max[1] - ref.bbox.min[1]) * (ref.bbox.max[2] - ref.bbox.min[2]);
  const genVol = (gen.bbox.max[0] - gen.bbox.min[0]) * (gen.bbox.max[1] - gen.bbox.min[1]) * (gen.bbox.max[2] - gen.bbox.min[2]);
  // Intersection bbox
  const ix0 = Math.max(ref.bbox.min[0], gen.bbox.min[0]);
  const iy0 = Math.max(ref.bbox.min[1], gen.bbox.min[1]);
  const iz0 = Math.max(ref.bbox.min[2], gen.bbox.min[2]);
  const ix1 = Math.min(ref.bbox.max[0], gen.bbox.max[0]);
  const iy1 = Math.min(ref.bbox.max[1], gen.bbox.max[1]);
  const iz1 = Math.min(ref.bbox.max[2], gen.bbox.max[2]);
  const intersectVol = Math.max(0, ix1 - ix0) * Math.max(0, iy1 - iy0) * Math.max(0, iz1 - iz0);
  const unionVol = refVol + genVol - intersectVol;
  const iou = unionVol > 0 ? intersectVol / unionVol : 0;
  return { iou, refVol, genVol };
}

/**
 * Score a generated STL against a reference STL. Both must be binary STL.
 *
 * The point clouds are sampled to at most `maxSamples` vertices each
 * (default 2000) so the brute-force O(N×M) chamfer stays under ~1 second.
 * For meshes with ~10k triangles, raising this to 5000 still completes
 * within a few seconds and gives sub-mm chamfer resolution.
 */
export function scoreMesh(
  generatedStlPath: string,
  referenceStlPath: string,
  opts: { maxSamples?: number } = {},
): MeshScoreResult {
  const maxSamples = opts.maxSamples ?? 2000;
  const ref = loadSTL(referenceStlPath);
  const gen = loadSTL(generatedStlPath);

  const refPoints = samplePoints(ref, maxSamples);
  const genPoints = samplePoints(gen, maxSamples);

  // Bidirectional chamfer: mean of (gen→ref) and (ref→gen) nearest-neighbor distances.
  const distsGenToRef = nearestNeighborDistances(genPoints, refPoints);
  const distsRefToGen = nearestNeighborDistances(refPoints, genPoints);
  let sum = 0;
  for (let i = 0; i < distsGenToRef.length; i++) sum += distsGenToRef[i];
  for (let i = 0; i < distsRefToGen.length; i++) sum += distsRefToGen[i];
  const chamferDistance = sum / (distsGenToRef.length + distsRefToGen.length);

  // Hausdorff 99p: 99th-percentile of pooled distances (suppresses sample noise).
  const pooled = new Float32Array(distsGenToRef.length + distsRefToGen.length);
  pooled.set(distsGenToRef, 0);
  pooled.set(distsRefToGen, distsGenToRef.length);
  const sorted = Array.from(pooled).sort((a, b) => a - b);
  const hausdorff99p = sorted[Math.floor(sorted.length * 0.99)] ?? sorted[sorted.length - 1];

  const { iou, refVol, genVol } = bboxIoU(ref, gen);

  return {
    chamferDistance,
    hausdorff99p,
    bboxIoU: iou,
    referenceBboxVolume: refVol,
    generatedBboxVolume: genVol,
    referenceTriangles: ref.triangleCount,
    generatedTriangles: gen.triangleCount,
  };
}
