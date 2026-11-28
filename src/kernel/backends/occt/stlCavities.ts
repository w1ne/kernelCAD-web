// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/stlCavities.ts
//
// Sealed cavities in a multi-shell STL.
//
// A hollow part (a float, a sealed tank, a hollowed print) is written as an
// outward-facing outer shell plus an inward-facing shell around each void.
// Promoting every shell on its own turns each void into a separate inverted
// solid: the summed volume happens to be right, but a boolean then treats the
// inverted solid as all of space outside the void and returns the wrong
// material. A void belongs to the solid around it as an inner shell.
//
// A shell is a cavity when its signed volume is negative and one of its
// vertices lies inside an outward-facing shell; its host is the smallest such
// shell. Like the rest of the multi-shell path this assumes shells do not cross
// each other. An inward-facing shell with no host keeps the old behaviour.

import { getOC } from 'replicad';
import type { ManifoldTopology, WeldedMesh } from './stlTopology';

interface ShellMeasure {
  signedVolume: number;
  min: [number, number, number];
  max: [number, number, number];
  triangles: number[];
}

// Generic directions: a ray that grazes an edge or vertex is retried on the next one.
const RAY_DIRECTIONS: ReadonlyArray<readonly [number, number, number]> = [
  [0.5257311121, 0.3141592654, 0.7905694150],
  [-0.2718281828, 0.8660254038, 0.4190790326],
  [0.7071067812, -0.6180339887, 0.3432945273],
  [-0.5773502692, -0.4142135624, 0.7041241452],
  [0.1234567891, 0.9238795325, -0.3622154010],
];
const RAY_EDGE_MARGIN = 1e-9;

function measureShells(mesh: WeldedMesh, topo: ManifoldTopology): ShellMeasure[] {
  const { points, triangles } = mesh;
  const shells: ShellMeasure[] = [];
  for (let c = 0; c < topo.componentCount; c += 1) {
    shells.push({ signedVolume: 0, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], triangles: [] });
  }
  // Volumes are summed about the mesh's first point to keep the terms small far from the origin.
  const ox = points[0];
  const oy = points[1];
  const oz = points[2];
  for (let t = 0; t < triangles.length / 3; t += 1) {
    const shell = shells[topo.component[t]];
    shell.triangles.push(t);
    const corner: number[] = [];
    for (let k = 0; k < 3; k += 1) {
      const p = triangles[t * 3 + k] * 3;
      for (let axis = 0; axis < 3; axis += 1) {
        const value = points[p + axis];
        if (value < shell.min[axis]) shell.min[axis] = value;
        if (value > shell.max[axis]) shell.max[axis] = value;
      }
      corner.push(points[p] - ox, points[p + 1] - oy, points[p + 2] - oz);
    }
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = corner;
    shell.signedVolume += (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx)) / 6;
  }
  return shells;
}

/** Crossing parity of one ray against a shell; null when the ray grazes an edge or vertex. */
function rayParity(
  mesh: WeldedMesh,
  shell: ShellMeasure,
  origin: readonly [number, number, number],
  direction: readonly [number, number, number],
): boolean | null {
  const { points, triangles } = mesh;
  const [dx, dy, dz] = direction;
  let crossings = 0;
  for (const t of shell.triangles) {
    const a = triangles[t * 3] * 3;
    const b = triangles[t * 3 + 1] * 3;
    const c = triangles[t * 3 + 2] * 3;
    const e1x = points[b] - points[a];
    const e1y = points[b + 1] - points[a + 1];
    const e1z = points[b + 2] - points[a + 2];
    const e2x = points[c] - points[a];
    const e2y = points[c + 1] - points[a + 1];
    const e2z = points[c + 2] - points[a + 2];
    const px = dy * e2z - dz * e2y;
    const py = dz * e2x - dx * e2z;
    const pz = dx * e2y - dy * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    const scale = Math.hypot(e1x, e1y, e1z) * Math.hypot(e2x, e2y, e2z);
    if (Math.abs(det) <= RAY_EDGE_MARGIN * scale) {
      // Parallel to the triangle's plane: harmless unless the origin lies in that plane.
      const nx = e1y * e2z - e1z * e2y;
      const ny = e1z * e2x - e1x * e2z;
      const nz = e1x * e2y - e1y * e2x;
      const offset = nx * (origin[0] - points[a]) + ny * (origin[1] - points[a + 1]) + nz * (origin[2] - points[a + 2]);
      if (Math.abs(offset) <= RAY_EDGE_MARGIN * scale * Math.hypot(origin[0] - points[a], origin[1] - points[a + 1], origin[2] - points[a + 2])) {
        return null;
      }
      continue;
    }
    const sx = origin[0] - points[a];
    const sy = origin[1] - points[a + 1];
    const sz = origin[2] - points[a + 2];
    const u = (sx * px + sy * py + sz * pz) / det;
    if (u < -RAY_EDGE_MARGIN || u > 1 + RAY_EDGE_MARGIN) continue;
    const qx = sy * e1z - sz * e1y;
    const qy = sz * e1x - sx * e1z;
    const qz = sx * e1y - sy * e1x;
    const v = (dx * qx + dy * qy + dz * qz) / det;
    if (v < -RAY_EDGE_MARGIN || u + v > 1 + RAY_EDGE_MARGIN) continue;
    const distance = (e2x * qx + e2y * qy + e2z * qz) / det;
    if (distance < -RAY_EDGE_MARGIN) continue;
    if (u < RAY_EDGE_MARGIN || v < RAY_EDGE_MARGIN || u + v > 1 - RAY_EDGE_MARGIN || distance < RAY_EDGE_MARGIN) return null;
    crossings += 1;
  }
  return crossings % 2 === 1;
}

function pointInsideShell(mesh: WeldedMesh, shell: ShellMeasure, point: readonly [number, number, number]): boolean {
  for (const direction of RAY_DIRECTIONS) {
    const inside = rayParity(mesh, shell, point, direction);
    if (inside !== null) return inside;
  }
  return false;
}

/**
 * Per shell (connected component), the index of the outward-facing shell whose
 * material it is a sealed void in, or -1. Null when the mesh has no such void.
 */
export function cavityHosts(mesh: WeldedMesh, topo: ManifoldTopology): Int32Array | null {
  if (topo.componentCount < 2) return null;
  const shells = measureShells(mesh, topo);
  const outward = shells
    .map((shell, index) => ({ shell, index }))
    .filter(({ shell }) => shell.signedVolume > 0)
    .sort((a, b) => a.shell.signedVolume - b.shell.signedVolume);
  if (outward.length === 0 || outward.length === shells.length) return null;

  const hosts = new Int32Array(shells.length).fill(-1);
  let found = false;
  shells.forEach((cavity, index) => {
    if (!(cavity.signedVolume < 0)) return;
    const p = mesh.triangles[cavity.triangles[0] * 3] * 3;
    const point: [number, number, number] = [mesh.points[p], mesh.points[p + 1], mesh.points[p + 2]];
    for (const candidate of outward) {
      const { min, max } = candidate.shell;
      const strictlyInsideBounds =
        min[0] < cavity.min[0] && cavity.max[0] < max[0] &&
        min[1] < cavity.min[1] && cavity.max[1] < max[1] &&
        min[2] < cavity.min[2] && cavity.max[2] < max[2];
      if (!strictlyInsideBounds || -cavity.signedVolume >= candidate.shell.signedVolume) continue;
      if (pointInsideShell(mesh, candidate.shell, point)) {
        hosts[index] = candidate.index;
        found = true;
        return;
      }
    }
  });
  return found ? hosts : null;
}

/** One solid bounded by an outward-facing shell and its inward-facing void shells, if BRepCheck-valid. */
function promoteShellWithCavities(outer: unknown, cavities: readonly unknown[]): unknown | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const makeSolid = new oc.BRepBuilderAPI_MakeSolid_3(outer);
  for (const cavity of cavities) makeSolid.Add(cavity);
  let solid: unknown | null = null;
  if (makeSolid.IsDone()) {
    const candidate = makeSolid.Solid();
    const analyzer = new oc.BRepCheck_Analyzer(candidate, false, false);
    if (analyzer.IsValid_2()) solid = candidate;
    else candidate.delete?.();
    analyzer.delete?.();
  }
  makeSolid.delete?.();
  return solid;
}

/**
 * Promote the shells of a multi-shell mesh to solids, each sealed void joined
 * to its host as an inner shell. Returns one solid per shell that is not a
 * hosted void, or null (nothing kept) when any of them is not a valid solid.
 * The caller keeps ownership of `shells`.
 */
export function promoteShellsWithCavities(
  mesh: WeldedMesh,
  topo: ManifoldTopology,
  shells: readonly unknown[],
): unknown[] | null {
  const hosts = cavityHosts(mesh, topo);
  const solids: unknown[] = [];
  for (let i = 0; i < shells.length; i += 1) {
    if (hosts !== null && hosts[i] >= 0) continue;
    const cavities = hosts === null ? [] : shells.filter((_shell, j) => hosts[j] === i);
    const solid = promoteShellWithCavities(shells[i], cavities);
    if (solid === null) {
      for (const made of solids) (made as { delete?: () => void }).delete?.();
      return null;
    }
    solids.push(solid);
  }
  return solids;
}
