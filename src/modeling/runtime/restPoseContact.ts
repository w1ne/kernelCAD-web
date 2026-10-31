// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/restPoseContact.ts
//
// Rest-pose contact gate. Runs on every mechanism, including the ones
// whose articulated pose sweep is over budget, so an assembly that paints
// with links passing through each other (or links that never touch the
// part they are mated to) cannot come back `ok`.
//
// Two checks, both on the already-lowered rest scene:
//
//   1. Penetration. Every part pair whose world AABBs overlap is measured
//      on its analysis tessellation (`getMesh()`): the shared volume is
//      integrated on a voxel grid inside the AABB overlap, a grid point
//      counting as inside a mesh when at least two of the three axis rays
//      through it cross that mesh an odd number of times. The vote keeps a
//      vendor mesh with a few open seams from reading as solid air (or
//      solid everywhere). The shared rule `isActionableOverlap` decides:
//      shared volume above 0.01 mm³ AND thicker than
//      `REST_PENETRATION_DEPTH_MM` (0.3 mm, the voxel/mesh noise floor)
//      somewhere is an error. Thinner overlaps on BREP parts are still
//      caught exactly by the default-pose BREP check (validator). Thickness is the exact overlap of the two meshes' inside
//      intervals along each axis ray, minimum over the three axes. Coincident faces, a pin in a clearance bore, and a part
//      sitting in a pocket all share ~0 volume and pass.
//
//      This is mesh-based on purpose. OCCT booleans on polyhedral solids
//      sewn from STL report wildly wrong common volumes (the SO-100 base
//      vs its pan servo: 10,857 mm³ from BRepAlgoAPI_Common, 21 mm³ by
//      point sampling and by an exact manifold boolean). The mesh integral
//      is the same for analytic BREP and for imported meshes.
//
//      `solvedModel({ ignore })` is NOT honoured here. That list silences
//      the per-pose BREP sweep and the validator; at rest the drawing must
//      be physically consistent, and a blanket ignore of every parent and
//      child pair is exactly how a colliding arm used to pass.
//
//   2. Contact. The two parts of every mate must meet: their minimum BREP
//      distance at rest must be within `REST_MATE_CONTACT_TOLERANCE_MM`.
//      A link mated to a servo it hovers next to is not seated.

import type { Assembly } from '../capture/assembly';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { OcctBackend, analysisBodyOf } from '../../kernel/backends/occt/occtBackend';
import type { Transform } from '../../shared/runtime/se3';
import { parseConnectorRef, type MateRecord } from '../mates/mate';
import { CONTACT_THICKNESS_MM, isActionableOverlap, overlapThicknessMm } from './jointContactCap';
import { JOINT_MESH_GAP_TOLERANCE_MM, measureBodyToBodyGap } from './jointMeshContinuity';

/** Largest rest-pose gap (mm) between the two parts of a mate. */
export const REST_MATE_CONTACT_TOLERANCE_MM = JOINT_MESH_GAP_TOLERANCE_MM;

/**
 * Shared material thinner than this (mm) everywhere is a contact sliver,
 * not a collision: tessellated coincident faces, a thread or gear-tooth
 * flank in modelled contact, a press-fit skin. 0.3 mm is about one FDM
 * line width and above the 0.05 mm analysis-mesh deflection on both sides.
 */
export const REST_PENETRATION_DEPTH_MM = 0.3;

/** Voxel edge bounds (mm) and the grid size cap per pair. */
const MIN_CELL_MM = 0.25;
const MAX_CELLS_PER_PAIR = 96 * 96 * 96;

export interface WorldMesh {
  /** Mesh volume agrees with the BREP volume (the tessellation is closed). */
  readonly closed: boolean;
  readonly positions: Float64Array;
  readonly indices: Uint32Array;
  readonly min: [number, number, number];
  readonly max: [number, number, number];
}

export interface RestPenetration {
  readonly a: string;
  readonly b: string;
  readonly volumeMm3: number;
  /** Largest local thickness of the shared region (mm). */
  readonly thicknessMm: number;
  /** World-space centre of the shared region. */
  readonly at: [number, number, number];
  /** Voxel edge used for the integral (mm). */
  readonly cellMm: number;
  /** Thickness (mm) at or below which this measurement counts as contact. */
  readonly contactThicknessMm: number;
}

export interface RestMateGap {
  readonly mateName: string;
  readonly a: string;
  readonly b: string;
  readonly gapMm: number;
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

/**
 * For axis `k`, cast one ray per grid column (the other two axes) and mark
 * which grid points along it have odd crossing parity. `votes[idx]` is
 * incremented for each inside verdict.
 */
type RayGrid = {
  readonly u: 0 | 1 | 2;
  readonly v: 0 | 1 | 2;
  readonly k: 0 | 1 | 2;
  readonly nu: number;
  readonly nv: number;
  readonly origin: [number, number, number];
  readonly cell: number;
  // A tiny irrational nudge keeps rays off shared edges and vertices.
  readonly ju: number;
  readonly jv: number;
};

function cellRange(lo: number, hi: number, origin: number, jitter: number, cell: number, n: number): [number, number] {
  return [
    Math.max(0, Math.ceil((lo - origin - jitter) / cell - 0.5)),
    Math.min(n - 1, Math.floor((hi - origin - jitter) / cell - 0.5)),
  ];
}

// Records where the axis-k rays through the grid columns cross one triangle.
function rasterTriangle(g: RayGrid, P: Float64Array, a: number, b: number, c: number, hits: number[][]): void {
  const { u, v, k } = g;
  const au = P[a + u], av = P[a + v], ak = P[a + k];
  const bu = P[b + u], bv = P[b + v], bk = P[b + k];
  const cu = P[c + u], cv = P[c + v], ck = P[c + k];
  const [i0, i1] = cellRange(Math.min(au, bu, cu), Math.max(au, bu, cu), g.origin[u], g.ju, g.cell, g.nu);
  const [j0, j1] = cellRange(Math.min(av, bv, cv), Math.max(av, bv, cv), g.origin[v], g.jv, g.cell, g.nv);
  if (i0 > i1 || j0 > j1) return;
  const det = (bu - au) * (cv - av) - (cu - au) * (bv - av);
  if (Math.abs(det) < 1e-12) return;
  for (let i = i0; i <= i1; i++) {
    const pu = g.origin[u] + (i + 0.5) * g.cell + g.ju;
    for (let j = j0; j <= j1; j++) {
      const pv = g.origin[v] + (j + 0.5) * g.cell + g.jv;
      const w1 = ((bu - pu) * (cv - pv) - (cu - pu) * (bv - pv)) / det;
      const w2 = ((cu - pu) * (av - pv) - (au - pu) * (cv - pv)) / det;
      const w3 = 1 - w1 - w2;
      if (w1 < 0 || w2 < 0 || w3 < 0) continue;
      (hits[i * g.nv + j] ??= []).push(w1 * ak + w2 * bk + w3 * ck);
    }
  }
}

// Walks one sorted ray: every cell centre after an odd number of crossings
// is inside; it gets a vote and, when asked, its inside-interval bounds.
function voteColumn(
  list: number[],
  base: number,
  strideK: number,
  nk: number,
  originK: number,
  cell: number,
  votes: Uint8Array,
  bounds?: { lo: Float32Array; hi: Float32Array },
): void {
  list.sort((x, y) => x - y);
  let h = 0;
  for (let s = 0; s < nk; s++) {
    const pk = originK + (s + 0.5) * cell;
    while (h < list.length && list[h] < pk) h++;
    if ((h & 1) === 0) continue;
    const idx = base + s * strideK;
    votes[idx]++;
    if (bounds !== undefined) {
      bounds.lo[idx] = list[h - 1];
      bounds.hi[idx] = h < list.length ? list[h] : Infinity;
    }
  }
}

function castAxis(
  mesh: WorldMesh,
  k: 0 | 1 | 2,
  origin: [number, number, number],
  cell: number,
  dims: [number, number, number],
  votes: Uint8Array,
  bounds?: { lo: Float32Array; hi: Float32Array },
): void {
  const u = ((k + 1) % 3) as 0 | 1 | 2;
  const v = ((k + 2) % 3) as 0 | 1 | 2;
  const g: RayGrid = { u, v, k, nu: dims[u], nv: dims[v], origin, cell, ju: cell * 0.00137, jv: cell * 0.00211 };
  const hits: number[][] = new Array(g.nu * g.nv);
  const I = mesh.indices;
  for (let t = 0; t < I.length; t += 3) {
    rasterTriangle(g, mesh.positions, 3 * I[t], 3 * I[t + 1], 3 * I[t + 2], hits);
  }
  const stride: [number, number, number] = [dims[1] * dims[2], dims[2], 1];
  for (let i = 0; i < g.nu; i++) {
    for (let j = 0; j < g.nv; j++) {
      const list = hits[i * g.nv + j];
      if (list === undefined) continue;
      voteColumn(list, i * stride[u] + j * stride[v], stride[k], dims[k], origin[k], cell, votes, bounds);
    }
  }
}

/** Shared volume of two closed (or nearly closed) world meshes, in mm³. */
// Local thickness of the shared region at each grid point: along each
// axis the exact overlap of the two inside-intervals through it (from the
// ray hits, not the voxels), minimum over the three axes. A thin contact
// sliver (thread flank, tooth flank, coincident tessellated faces) is thin
// along the axis closest to its normal however long it is.
function sharedThickness(
  a: WorldMesh,
  b: WorldMesh,
  lo: [number, number, number],
  cell: number,
  dims: [number, number, number],
  votesA: Uint8Array,
  votesB: Uint8Array,
): Float32Array {
  const total = votesA.length;
  const thick = new Float32Array(total).fill(Infinity);
  const bA = { lo: new Float32Array(total), hi: new Float32Array(total) };
  const bB = { lo: new Float32Array(total), hi: new Float32Array(total) };
  for (const k of [0, 1, 2] as const) {
    bA.lo.fill(NaN); bB.lo.fill(NaN);
    castAxis(a, k, lo, cell, dims, votesA, bA);
    castAxis(b, k, lo, cell, dims, votesB, bB);
    for (let idx = 0; idx < total; idx++) {
      if (Number.isNaN(bA.lo[idx]) || Number.isNaN(bB.lo[idx])) continue;
      const t = Math.min(bA.hi[idx], bB.hi[idx]) - Math.max(bA.lo[idx], bB.lo[idx]);
      if (t < thick[idx]) thick[idx] = t;
    }
  }
  return thick;
}

// Counts grid points inside both meshes (2-of-3 votes each), their deepest
// thickness and their centroid.
function tallyShared(
  votesA: Uint8Array,
  votesB: Uint8Array,
  thick: Float32Array,
  dims: [number, number, number],
  lo: [number, number, number],
  cell: number,
): { count: number; depth: number; at: [number, number, number] } {
  let count = 0;
  let depth = 0;
  const sum = [0, 0, 0];
  const plane = dims[1] * dims[2];
  for (let idx = 0; idx < votesA.length; idx++) {
    if (votesA[idx] < 2 || votesB[idx] < 2) continue;
    count++;
    if (Number.isFinite(thick[idx]) && thick[idx] > depth) depth = thick[idx];
    sum[0] += Math.floor(idx / plane);
    sum[1] += Math.floor(idx / dims[2]) % dims[1];
    sum[2] += idx % dims[2];
  }
  const at: [number, number, number] = count === 0
    ? lo
    : [0, 1, 2].map((k) => lo[k] + (sum[k] / count + 0.5) * cell) as [number, number, number];
  return { count, depth, at };
}

export function meshOverlapVolume(
  a: WorldMesh,
  b: WorldMesh,
): { volumeMm3: number; thicknessMm: number; at: [number, number, number]; cellMm: number } {
  const lo: [number, number, number] = [0, 0, 0];
  const ext: [number, number, number] = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    lo[k] = Math.max(a.min[k], b.min[k]);
    ext[k] = Math.min(a.max[k], b.max[k]) - lo[k];
    if (ext[k] <= 0) return { volumeMm3: 0, thicknessMm: 0, at: lo, cellMm: 0 };
  }
  const cell = Math.max(MIN_CELL_MM, Math.cbrt((ext[0] * ext[1] * ext[2]) / MAX_CELLS_PER_PAIR));
  const dims = ext.map((e) => Math.max(1, Math.ceil(e / cell))) as [number, number, number];
  const total = dims[0] * dims[1] * dims[2];
  const votesA = new Uint8Array(total);
  const votesB = new Uint8Array(total);
  const thick = sharedThickness(a, b, lo, cell, dims, votesA, votesB);
  const { count, depth, at } = tallyShared(votesA, votesB, thick, dims, lo, cell);
  return { volumeMm3: count * cell * cell * cell, thicknessMm: depth, at, cellMm: cell };
}

function boxesOverlap(a: WorldMesh, b: WorldMesh): boolean {
  for (let k = 0; k < 3; k++) {
    if (a.min[k] >= b.max[k] || b.min[k] >= a.max[k]) return false;
  }
  return true;
}

/** BREP common volume and mean thickness (2·V/A), for a part whose
 *  tessellation is not closed. */
function brepOverlap(
  a: SceneBackend['parts'][number],
  b: SceneBackend['parts'][number],
  ma: WorldMesh,
  mb: WorldMesh,
): { volumeMm3: number; thicknessMm: number; at: [number, number, number]; cellMm: number } {
  const at = [0, 1, 2].map((k) => (Math.max(ma.min[k], mb.min[k]) + Math.min(ma.max[k], mb.max[k])) / 2) as [number, number, number];
  if (!(a.shape instanceof OcctBackend) || !(b.shape instanceof OcctBackend)) {
    return { volumeMm3: NaN, thicknessMm: NaN, at, cellMm: 0 };
  }
  try {
    const wa = (analysisBodyOf(a.shape) as OcctBackend).clone().applyTransform(a.worldTransform);
    const wb = (analysisBodyOf(b.shape) as OcctBackend).clone().applyTransform(b.worldTransform);
    const m = wa.intersectionMetrics(wb);
    return { volumeMm3: m.volumeMm3, thicknessMm: overlapThicknessMm(m.volumeMm3, m.areaMm2), at, cellMm: 0 };
  } catch {
    // Unmeasured: volume 0 here is "no BREP evidence", never "no overlap" —
    // the mesh path keeps its own result when the boolean fails.
    return { volumeMm3: NaN, thicknessMm: NaN, at, cellMm: 0 };
  }
}

/** Every part pair that really overlaps at rest (`isActionableOverlap`). */
export function restPosePenetrations(scene: SceneBackend): RestPenetration[] {
  const meshes: { name: string; mesh: WorldMesh; part: SceneBackend['parts'][number] }[] = [];
  for (const p of scene.parts) {
    // Exact/closed-solid validation does not currently classify display-only
    // triangle soups. Leave those pairs unchecked while retaining BRep checks.
    if (!(p.shape instanceof OcctBackend)) continue;
    const mesh = worldMesh(analysisBodyOf(p.shape) as OcctBackend, p.worldTransform);
    if (mesh !== undefined) meshes.push({ name: p.name, mesh, part: p });
  }
  const out: RestPenetration[] = [];
  for (let i = 0; i < meshes.length; i++) {
    for (let j = i + 1; j < meshes.length; j++) {
      const A = meshes[i];
      const B = meshes[j];
      if (!boxesOverlap(A.mesh, B.mesh)) continue;
      const onMesh = A.mesh.closed && B.mesh.closed;
      const r = onMesh
        ? meshOverlapVolume(A.mesh, B.mesh)
        : brepOverlap(A.part, B.part, A.mesh, B.mesh);
      const contactThicknessMm = onMesh ? REST_PENETRATION_DEPTH_MM : CONTACT_THICKNESS_MM;
      if (!isActionableOverlap(r, contactThicknessMm)) continue;
      // A real overlap shows in both measurements. The voxel integral of two
      // tessellations reads a few mm³ where curved analytic faces only
      // touch; the exact BREP common then reads ~0 and wins. (On STL-sewn
      // solids the BREP common over-reads, so the mesh value still stands.)
      if (onMesh) {
        const exact = brepOverlap(A.part, B.part, A.mesh, B.mesh);
        if (Number.isFinite(exact.volumeMm3) && !isActionableOverlap(exact)) continue;
      }
      out.push({ a: A.name, b: B.name, ...r, contactThicknessMm });
    }
  }
  return out;
}

/** Every mate whose two parts do not meet at rest. */
export function restPoseMateGaps(
  arm: Assembly,
  scene: SceneBackend,
  toleranceMm: number = REST_MATE_CONTACT_TOLERANCE_MM,
  includeMate: (mate: MateRecord) => boolean = () => true,
): RestMateGap[] {
  const byName = new Map(scene.parts.map((p) => [p.name, p]));
  const out: RestMateGap[] = [];
  const seen = new Map<string, number | undefined>();
  for (const mate of arm.__mates()) {
    if (!includeMate(mate)) continue;
    let a: string;
    let b: string;
    try {
      a = parseConnectorRef(mate.a).partName;
      b = parseConnectorRef(mate.b).partName;
    } catch {
      continue;
    }
    if (a === b) continue;
    const pa = byName.get(a);
    const pb = byName.get(b);
    if (pa === undefined || pb === undefined) continue;
    if (!(pa.shape instanceof OcctBackend) || !(pb.shape instanceof OcctBackend)) continue;
    const key = a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
    if (!seen.has(key)) {
      seen.set(key, measureBodyToBodyGap(
        analysisBodyOf(pa.shape) as OcctBackend, pa.worldTransform, analysisBodyOf(pb.shape) as OcctBackend, pb.worldTransform,
      ));
    }
    const gap = seen.get(key);
    if (gap !== undefined && gap > toleranceMm) out.push({ mateName: mate.name, a, b, gapMm: gap });
  }
  return out;
}
