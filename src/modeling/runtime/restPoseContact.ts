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
//      solid everywhere). Shared volume above `REST_PENETRATION_CAP_MM3`
//      (the uniform 20 mm³ contact-noise cap the pose sweep uses) is an
//      error. Coincident faces, a pin in a clearance bore, and a part
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
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { Transform } from '../../shared/runtime/se3';
import { parseConnectorRef } from '../mates/mate';
import { JOINT_CONTACT_NOISE_MM3 } from './jointContactCap';
import { JOINT_MESH_GAP_TOLERANCE_MM, measureBodyToBodyGap } from './jointMeshContinuity';

/** Shared volume (mm³) above which two parts interpenetrate at rest. */
export const REST_PENETRATION_CAP_MM3 = JOINT_CONTACT_NOISE_MM3;

/** Largest rest-pose gap (mm) between the two parts of a mate. */
export const REST_MATE_CONTACT_TOLERANCE_MM = JOINT_MESH_GAP_TOLERANCE_MM;

/** Voxel edge bounds (mm) and the grid size cap per pair. */
const MIN_CELL_MM = 0.25;
const MAX_CELLS_PER_PAIR = 96 * 96 * 96;

export interface WorldMesh {
  readonly positions: Float64Array;
  readonly indices: Uint32Array;
  readonly min: [number, number, number];
  readonly max: [number, number, number];
}

export interface RestPenetration {
  readonly a: string;
  readonly b: string;
  readonly volumeMm3: number;
  /** World-space centre of the shared region. */
  readonly at: [number, number, number];
  /** Voxel edge used for the integral (mm). */
  readonly cellMm: number;
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
  return { positions, indices: mesh.indices, min, max };
}

/**
 * For axis `k`, cast one ray per grid column (the other two axes) and mark
 * which grid points along it have odd crossing parity. `votes[idx]` is
 * incremented for each inside verdict.
 */
function castAxis(
  mesh: WorldMesh,
  k: 0 | 1 | 2,
  origin: [number, number, number],
  cell: number,
  dims: [number, number, number],
  votes: Uint8Array,
): void {
  const u = ((k + 1) % 3) as 0 | 1 | 2;
  const v = ((k + 2) % 3) as 0 | 1 | 2;
  const nu = dims[u];
  const nv = dims[v];
  const hits: number[][] = new Array(nu * nv);
  // A tiny irrational nudge keeps rays off shared edges and vertices.
  const ju = cell * 0.00137;
  const jv = cell * 0.00211;
  const P = mesh.positions;
  const I = mesh.indices;
  for (let t = 0; t < I.length; t += 3) {
    const a = 3 * I[t];
    const b = 3 * I[t + 1];
    const c = 3 * I[t + 2];
    const au = P[a + u], av = P[a + v], ak = P[a + k];
    const bu = P[b + u], bv = P[b + v], bk = P[b + k];
    const cu = P[c + u], cv = P[c + v], ck = P[c + k];
    const lo = Math.min(au, bu, cu), hi = Math.max(au, bu, cu);
    const lov = Math.min(av, bv, cv), hiv = Math.max(av, bv, cv);
    const i0 = Math.max(0, Math.ceil((lo - origin[u] - ju) / cell - 0.5));
    const i1 = Math.min(nu - 1, Math.floor((hi - origin[u] - ju) / cell - 0.5));
    const j0 = Math.max(0, Math.ceil((lov - origin[v] - jv) / cell - 0.5));
    const j1 = Math.min(nv - 1, Math.floor((hiv - origin[v] - jv) / cell - 0.5));
    if (i0 > i1 || j0 > j1) continue;
    const det = (bu - au) * (cv - av) - (cu - au) * (bv - av);
    if (Math.abs(det) < 1e-12) continue;
    for (let i = i0; i <= i1; i++) {
      const pu = origin[u] + (i + 0.5) * cell + ju;
      for (let j = j0; j <= j1; j++) {
        const pv = origin[v] + (j + 0.5) * cell + jv;
        const w1 = ((bu - pu) * (cv - pv) - (cu - pu) * (bv - pv)) / det;
        const w2 = ((cu - pu) * (av - pv) - (au - pu) * (cv - pv)) / det;
        const w3 = 1 - w1 - w2;
        if (w1 < 0 || w2 < 0 || w3 < 0) continue;
        const col = i * nv + j;
        (hits[col] ??= []).push(w1 * ak + w2 * bk + w3 * ck);
      }
    }
  }
  const nk = dims[k];
  const stride: [number, number, number] = [dims[1] * dims[2], dims[2], 1];
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const list = hits[i * nv + j];
      if (list === undefined) continue;
      list.sort((x, y) => x - y);
      let h = 0;
      for (let s = 0; s < nk; s++) {
        const pk = origin[k] + (s + 0.5) * cell;
        while (h < list.length && list[h] < pk) h++;
        if ((h & 1) === 1) votes[i * stride[u] + j * stride[v] + s * stride[k]]++;
      }
    }
  }
}

/** Shared volume of two closed (or nearly closed) world meshes, in mm³. */
export function meshOverlapVolume(
  a: WorldMesh,
  b: WorldMesh,
): { volumeMm3: number; at: [number, number, number]; cellMm: number } {
  const lo: [number, number, number] = [0, 0, 0];
  const ext: [number, number, number] = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    lo[k] = Math.max(a.min[k], b.min[k]);
    ext[k] = Math.min(a.max[k], b.max[k]) - lo[k];
    if (ext[k] <= 0) return { volumeMm3: 0, at: lo, cellMm: 0 };
  }
  const cell = Math.max(MIN_CELL_MM, Math.cbrt((ext[0] * ext[1] * ext[2]) / MAX_CELLS_PER_PAIR));
  const dims = ext.map((e) => Math.max(1, Math.ceil(e / cell))) as [number, number, number];
  const total = dims[0] * dims[1] * dims[2];
  const votesA = new Uint8Array(total);
  const votesB = new Uint8Array(total);
  for (const k of [0, 1, 2] as const) {
    castAxis(a, k, lo, cell, dims, votesA);
    castAxis(b, k, lo, cell, dims, votesB);
  }
  let count = 0;
  const sum = [0, 0, 0];
  for (let x = 0; x < dims[0]; x++) {
    for (let y = 0; y < dims[1]; y++) {
      for (let z = 0; z < dims[2]; z++) {
        const idx = x * dims[1] * dims[2] + y * dims[2] + z;
        if (votesA[idx] >= 2 && votesB[idx] >= 2) {
          count++;
          sum[0] += x; sum[1] += y; sum[2] += z;
        }
      }
    }
  }
  const at: [number, number, number] = count === 0
    ? lo
    : [0, 1, 2].map((k) => lo[k] + (sum[k] / count + 0.5) * cell) as [number, number, number];
  return { volumeMm3: count * cell * cell * cell, at, cellMm: cell };
}

function boxesOverlap(a: WorldMesh, b: WorldMesh): boolean {
  for (let k = 0; k < 3; k++) {
    if (a.min[k] >= b.max[k] || b.min[k] >= a.max[k]) return false;
  }
  return true;
}

/** Every part pair sharing more than `capMm3` of volume at rest. */
export function restPosePenetrations(
  scene: SceneBackend,
  capMm3: number = REST_PENETRATION_CAP_MM3,
): RestPenetration[] {
  const meshes: { name: string; mesh: WorldMesh }[] = [];
  for (const p of scene.parts) {
    const mesh = worldMesh(p.shape as OcctBackend, p.worldTransform);
    if (mesh !== undefined) meshes.push({ name: p.name, mesh });
  }
  const out: RestPenetration[] = [];
  for (let i = 0; i < meshes.length; i++) {
    for (let j = i + 1; j < meshes.length; j++) {
      const A = meshes[i];
      const B = meshes[j];
      if (!boxesOverlap(A.mesh, B.mesh)) continue;
      const r = meshOverlapVolume(A.mesh, B.mesh);
      if (r.volumeMm3 > capMm3) out.push({ a: A.name, b: B.name, ...r });
    }
  }
  return out;
}

/** Every mate whose two parts do not meet at rest. */
export function restPoseMateGaps(
  arm: Assembly,
  scene: SceneBackend,
  toleranceMm: number = REST_MATE_CONTACT_TOLERANCE_MM,
): RestMateGap[] {
  const byName = new Map(scene.parts.map((p) => [p.name, p]));
  const out: RestMateGap[] = [];
  const seen = new Map<string, number | undefined>();
  for (const mate of arm.__mates()) {
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
    const key = a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
    if (!seen.has(key)) {
      seen.set(key, measureBodyToBodyGap(
        pa.shape as OcctBackend, pa.worldTransform, pb.shape as OcctBackend, pb.worldTransform,
      ));
    }
    const gap = seen.get(key);
    if (gap !== undefined && gap > toleranceMm) out.push({ mateName: mate.name, a, b, gapMm: gap });
  }
  return out;
}
