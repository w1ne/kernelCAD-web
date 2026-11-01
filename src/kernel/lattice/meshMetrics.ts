// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/lattice/meshMetrics.ts
//
// Exact metrics of a closed indexed triangle mesh: signed volume (divergence
// theorem), surface area, bounding box, and the topology checks a printable
// solid must pass — every undirected edge used by exactly two triangles, in
// opposite directions (watertight, edge-manifold, consistently oriented).

export interface MeshTopologyReport {
  /** Every edge has exactly two incident triangles. */
  watertight: boolean;
  /** Every edge is traversed once in each direction. */
  consistentOrientation: boolean;
  openEdges: number;
  nonManifoldEdges: number;
  flippedEdges: number;
  /** Euler characteristic V - E + F. */
  euler: number;
}

export interface MeshMassReport {
  volumeMm3: number;
  areaMm2: number;
  /** Centroid of the enclosed volume, mm. */
  centroid: [number, number, number];
  bbox: { min: [number, number, number]; max: [number, number, number] };
}

export function meshMass(positions: ArrayLike<number>, indices: ArrayLike<number>): MeshMassReport {
  let vol6 = 0, area2 = 0, cx = 0, cy = 0, cz = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const a = 3 * indices[t], b = 3 * indices[t + 1], c = 3 * indices[t + 2];
    const ax = positions[a], ay = positions[a + 1], az = positions[a + 2];
    const bx = positions[b], by = positions[b + 1], bz = positions[b + 2];
    const qx = positions[c], qy = positions[c + 1], qz = positions[c + 2];
    const d = ax * (by * qz - bz * qy) - ay * (bx * qz - bz * qx) + az * (bx * qy - by * qx);
    vol6 += d;
    cx += d * (ax + bx + qx); cy += d * (ay + by + qy); cz += d * (az + bz + qz);
    const ux = bx - ax, uy = by - ay, uz = bz - az, vx = qx - ax, vy = qy - ay, vz = qz - az;
    area2 += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
  }
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      const v = positions[i + a];
      if (v < min[a]) min[a] = v;
      if (v > max[a]) max[a] = v;
    }
  }
  const s = vol6 !== 0 ? 1 / (4 * vol6) : 0;
  return { volumeMm3: vol6 / 6, areaMm2: area2 / 2, centroid: [cx * s, cy * s, cz * s], bbox: { min, max } };
}

/** Every directed half-edge as one sortable key (min * V + max, times two,
 *  plus 1 when traversed max -> min); runs of equal undirected keys give the
 *  use count and directions of each edge. A native typed-array sort keeps it
 *  fast on multi-million-triangle lattices. */
export function meshTopology(vertexCount: number, indices: ArrayLike<number>): MeshTopologyReport {
  const keys = new Float64Array(indices.length);
  for (let t = 0; t < indices.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const u = indices[t + e], v = indices[t + ((e + 1) % 3)];
      keys[t + e] = u < v ? 2 * (u * vertexCount + v) : 2 * (v * vertexCount + u) + 1;
    }
  }
  keys.sort();
  let openEdges = 0, nonManifoldEdges = 0, flippedEdges = 0, edges = 0;
  for (let i = 0; i < keys.length;) {
    const edge = Math.floor(keys[i] / 2);
    let fwd = 0, rev = 0;
    while (i < keys.length && Math.floor(keys[i] / 2) === edge) {
      if (keys[i] % 2 === 0) fwd++; else rev++;
      i++;
    }
    edges++;
    const n = fwd + rev;
    if (n === 1) openEdges++;
    else if (n > 2) nonManifoldEdges++;
    else if (fwd !== 1) flippedEdges++;
  }
  return {
    watertight: openEdges === 0 && nonManifoldEdges === 0,
    consistentOrientation: openEdges === 0 && nonManifoldEdges === 0 && flippedEdges === 0,
    openEdges,
    nonManifoldEdges,
    flippedEdges,
    euler: vertexCount - edges + indices.length / 3,
  };
}
