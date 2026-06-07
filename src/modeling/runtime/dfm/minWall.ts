// src/modeling/runtime/dfm/minWall.ts
//
// W3 Task 5 — minimum wall thickness check via inward ray sampling over the
// export-grade mesh (`meshShapeForExport` output fed through TriangleBvh).
//
// Method, per (non-degenerate) triangle:
//   - centroid c, unit normal n from winding (meshShapeForExport emits
//     consistently OUTWARD winding — verified empirically on box / shell /
//     boolean meshes);
//   - cast from `c − n·ε` along `−n` (ε = 1e-4 mm) with the source triangle
//     skipped AND tMin = ε, so neither the source surface nor an
//     edge-sharing coplanar neighbour (which the BVH reports inclusively)
//     can register a bogus t ≈ 0 hit;
//   - nearest hit t is the candidate wall thickness. A candidate below the
//     threshold only counts when the SEGMENT MIDPOINT `c − n·(ε + t/2)` is
//     inside the solid (ray parity): a short hop across an AIR gap between
//     two nearby surfaces (or a cast launched outward by a locally inverted
//     winding) has its midpoint in air and is rejected — an air gap is not
//     a thin wall.
//
// Accuracy: SAMPLED, NOT EXACT — resolution is tessellation-bounded by
// design. One ray per triangle centroid means a thin spot smaller than the
// local triangle size can be missed, and the measured thickness understates
// the true wall by ε (1e-4 mm). Above 150k triangles a fixed-stride subset
// is sampled (every ceil(count/150000)-th triangle from index 0), keeping
// runs reproducible.
//
// Frame: the mesh is the part's LOCAL frame — wall thickness is invariant
// under the rigid placement transforms, so no world transform is applied.
//
// Clustering (deterministic): thin samples are sorted ascending by measured
// thickness (stable ties = triangle order) and greedily grouped. A sample
// joins the existing cluster (a) it shares a mesh vertex with — same
// connected thin patch, the welded export mesh makes vertex identity
// meaningful — or, failing that, (b) the first cluster whose worst-spot
// location is within 2 × minWallMm (this merges the two sides of the same
// wall, which are close in space but topologically disjoint). Otherwise it
// opens a new cluster. Because samples arrive ascending, each cluster's
// first sample is its worst spot and clusters are created in descending
// severity order.

import type { Vec3 } from '../../../shared/intent/types';
import { TriangleBvh, type DfmMesh } from './meshBvh';

/** Inward offset of the cast origin and the traversal floor (mm). Walls
 *  thinner than ~2ε are below any manufacturable scale, so the floor costs
 *  no real detection range. */
const RAY_EPS_MM = 1e-4;
/** Above this triangle count the sampler switches to a fixed-stride subset. */
const MAX_SAMPLED_TRIANGLES = 150_000;
const MAX_REPORTED_CLUSTERS = 10;
/** Same degenerate-triangle cutoff as TriangleBvh (skipped, not cast). */
const AREA_EPS = 1e-12;

export interface WallViolationCluster {
  /** Worst (thinnest) sample in the cluster. */
  thicknessMm: number;
  location: [number, number, number];
  sampleCount: number;
}

export interface MinWallResult {
  /** Thin-wall clusters, descending severity (thinnest first), capped at 10. */
  violations: WallViolationCluster[];
  /** Rays actually cast. */
  sampleCount: number;
  /** Global minimum measured wall thickness (Infinity if no ray hit).
   *  Air-gap crossings rejected by the midpoint inside-test are NOT wall
   *  measurements and are excluded. */
  thinnestMm: number;
}

interface ThinSample {
  t: number;
  location: [number, number, number];
  /** Vertex indices of the source triangle (for topological clustering). */
  va: number;
  vb: number;
  vc: number;
}

/**
 * Check the minimum wall thickness of one part's export-grade mesh (the
 * part's LOCAL frame — thickness is transform-invariant) against
 * `minWallMm`. Sampled, not exact: one inward ray per (non-degenerate)
 * triangle centroid, so resolution is bounded by the tessellation; meshes
 * above 150k triangles are deterministically subsampled at a fixed stride.
 */
export function checkMinWall(mesh: DfmMesh, minWallMm: number): MinWallResult {
  const bvh = new TriangleBvh(mesh);
  const { vertices, triangles } = mesh;
  const numTris = (triangles.length / 3) | 0;
  const stride = numTris > MAX_SAMPLED_TRIANGLES ? Math.ceil(numTris / MAX_SAMPLED_TRIANGLES) : 1;

  let sampleCount = 0;
  let thinnestMm = Infinity;
  const thin: ThinSample[] = [];

  for (let i = 0; i < numTris; i += stride) {
    const va = triangles[3 * i];
    const vb = triangles[3 * i + 1];
    const vc = triangles[3 * i + 2];
    const a = va * 3, b = vb * 3, c = vc * 3;
    const ax = vertices[a], ay = vertices[a + 1], az = vertices[a + 2];
    const e1x = vertices[b] - ax, e1y = vertices[b + 1] - ay, e1z = vertices[b + 2] - az;
    const e2x = vertices[c] - ax, e2y = vertices[c + 1] - ay, e2z = vertices[c + 2] - az;
    // Winding normal (outward for meshShapeForExport output).
    let nx = e1y * e2z - e1z * e2y;
    let ny = e1z * e2x - e1x * e2z;
    let nz = e1x * e2y - e1y * e2x;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (!(len / 2 >= AREA_EPS)) continue; // degenerate (or NaN): skip, do not cast
    nx /= len; ny /= len; nz /= len;

    const cx = (ax + vertices[b] + vertices[c]) / 3;
    const cy = (ay + vertices[b + 1] + vertices[c + 1]) / 3;
    const cz = (az + vertices[b + 2] + vertices[c + 2]) / 3;

    sampleCount++;
    const origin: Vec3 = [cx - nx * RAY_EPS_MM, cy - ny * RAY_EPS_MM, cz - nz * RAY_EPS_MM];
    const dir: Vec3 = [-nx, -ny, -nz];
    const hit = bvh.raycast(origin, dir, { skipTri: i, tMin: RAY_EPS_MM });
    if (hit === null) continue;
    const t = hit.t;

    if (t < minWallMm) {
      // Midpoint inside-test: a thin segment whose midpoint is in air is an
      // air gap between surfaces, not a wall — reject it entirely.
      const d = RAY_EPS_MM + t / 2;
      const mid: Vec3 = [cx - nx * d, cy - ny * d, cz - nz * d];
      if (!bvh.pointInside(mid)) continue;
      thin.push({ t, location: [cx, cy, cz], va, vb, vc });
    }
    if (t < thinnestMm) thinnestMm = t;
  }

  return {
    violations: clusterThinSamples(thin, minWallMm),
    sampleCount,
    thinnestMm,
  };
}

/** Greedy deterministic clustering of thin samples (see module header). */
function clusterThinSamples(thin: ThinSample[], minWallMm: number): WallViolationCluster[] {
  thin.sort((s, u) => s.t - u.t); // stable: ties keep triangle order
  const joinR = 2 * minWallMm;
  const joinR2 = joinR * joinR;

  const clusters: WallViolationCluster[] = [];
  // First cluster to claim a mesh vertex owns it; later samples sharing the
  // vertex join that cluster (connected thin patches stay together).
  const vertexCluster = new Map<number, number>();

  for (const s of thin) {
    let target = -1;
    // (a) topological adjacency — prefer the most severe matching cluster.
    for (const v of [s.va, s.vb, s.vc]) {
      const c = vertexCluster.get(v);
      if (c !== undefined && (target === -1 || c < target)) target = c;
    }
    // (b) proximity to a cluster's worst spot, in severity order.
    if (target === -1) {
      for (let c = 0; c < clusters.length; c++) {
        const loc = clusters[c].location;
        const dx = s.location[0] - loc[0];
        const dy = s.location[1] - loc[1];
        const dz = s.location[2] - loc[2];
        if (dx * dx + dy * dy + dz * dz <= joinR2) {
          target = c;
          break;
        }
      }
    }
    if (target === -1) {
      // New cluster: first (= thinnest) sample is its worst spot.
      target = clusters.length;
      clusters.push({ thicknessMm: s.t, location: s.location, sampleCount: 0 });
    }
    clusters[target].sampleCount++;
    if (!vertexCluster.has(s.va)) vertexCluster.set(s.va, target);
    if (!vertexCluster.has(s.vb)) vertexCluster.set(s.vb, target);
    if (!vertexCluster.has(s.vc)) vertexCluster.set(s.vc, target);
  }

  // Creation order is ascending worst-thickness = descending severity.
  return clusters.slice(0, MAX_REPORTED_CLUSTERS);
}
