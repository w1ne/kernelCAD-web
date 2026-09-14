// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/reconstruct/section.ts
//
// Planar sections of an indexed mesh in the canonical frame (plane z = h).
//
// Each crossing triangle contributes one segment between the crossing points
// on its two straddling edges. Crossing points are keyed by the mesh EDGE they
// lie on, so neighbouring segments share endpoints exactly and loops chain by
// key instead of by fuzzy distance. Segments are oriented from the outward
// triangle normal (direction = Z × n), which makes material boundaries CCW
// and hole boundaries CW — the signed loop area is the material area.

import { polygonSignedArea } from './geom';

export interface SectionLoop {
  /** Flat [x0, y0, x1, y1, …], not repeated at the end. */
  xy: Float64Array;
  /** Positive for an outer material boundary, negative for a hole. */
  signedArea: number;
}

export interface Section {
  z: number;
  loops: SectionLoop[];
  /** Chains that did not close (open or non-manifold mesh). */
  openChains: number;
  /** Σ signed loop area = material area of the section. */
  materialArea: number;
}

export function sliceAtZ(positions: Float64Array, triangles: Uint32Array, zRequested: number): Section {
  const vCount = positions.length / 3;
  let z = zRequested;
  // Keep the plane off every vertex so each crossing is a clean edge crossing.
  for (let attempt = 0; attempt < 20; attempt++) {
    let clear = true;
    for (let v = 0; v < vCount; v++) {
      if (Math.abs(positions[v * 3 + 2] - z) < 1e-7) {
        clear = false;
        break;
      }
    }
    if (clear) break;
    z += 3.7e-6;
  }

  const next = new Map<number, number>();
  const point = new Map<number, [number, number]>();
  const triCount = triangles.length / 3;
  for (let t = 0; t < triCount; t++) {
    const i0 = triangles[t * 3], i1 = triangles[t * 3 + 1], i2 = triangles[t * 3 + 2];
    const z0 = positions[i0 * 3 + 2] - z, z1 = positions[i1 * 3 + 2] - z, z2 = positions[i2 * 3 + 2] - z;
    const above = (z0 > 0 ? 1 : 0) + (z1 > 0 ? 1 : 0) + (z2 > 0 ? 1 : 0);
    if (above === 0 || above === 3) continue;
    const crossings: Array<{ key: number; x: number; y: number }> = [];
    const edges: Array<[number, number, number, number]> = [
      [i0, i1, z0, z1],
      [i1, i2, z1, z2],
      [i2, i0, z2, z0],
    ];
    for (const [a, b, za, zb] of edges) {
      if (za > 0 === zb > 0) continue;
      const s = za / (za - zb);
      const x = positions[a * 3] + s * (positions[b * 3] - positions[a * 3]);
      const y = positions[a * 3 + 1] + s * (positions[b * 3 + 1] - positions[a * 3 + 1]);
      crossings.push({ key: a < b ? a * vCount + b : b * vCount + a, x, y });
    }
    if (crossings.length !== 2) continue;
    // Outward normal (x, y components only matter for the direction).
    const ax = positions[i0 * 3], ay = positions[i0 * 3 + 1], az = positions[i0 * 3 + 2];
    const e1x = positions[i1 * 3] - ax, e1y = positions[i1 * 3 + 1] - ay, e1z = positions[i1 * 3 + 2] - az;
    const e2x = positions[i2 * 3] - ax, e2y = positions[i2 * 3 + 1] - ay, e2z = positions[i2 * 3 + 2] - az;
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    // Z × n = (−ny, nx): material on the left.
    const dx = -ny, dy = nx;
    const [p, q] = crossings;
    const forward = (q.x - p.x) * dx + (q.y - p.y) * dy >= 0;
    const from = forward ? p : q;
    const to = forward ? q : p;
    if (from.key === to.key) continue;
    next.set(from.key, to.key);
    point.set(from.key, [from.x, from.y]);
    point.set(to.key, [to.x, to.y]);
  }

  const loops: SectionLoop[] = [];
  let openChains = 0;
  const used = new Set<number>();
  for (const start of next.keys()) {
    if (used.has(start)) continue;
    const coords: number[] = [];
    let k = start;
    let closed = false;
    for (let guard = 0; guard <= next.size; guard++) {
      used.add(k);
      const p = point.get(k)!;
      coords.push(p[0], p[1]);
      const nk = next.get(k);
      if (nk === undefined) break;
      if (nk === start) {
        closed = true;
        break;
      }
      if (used.has(nk)) break;
      k = nk;
    }
    if (!closed || coords.length < 6) {
      openChains++;
      continue;
    }
    const xy = Float64Array.from(coords);
    loops.push({ xy, signedArea: polygonSignedArea(xy) });
  }
  return { z, loops, openChains, materialArea: loops.reduce((s, l) => s + l.signedArea, 0) };
}
