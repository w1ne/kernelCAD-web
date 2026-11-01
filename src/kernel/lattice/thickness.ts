// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/lattice/thickness.ts
//
// Measured wall thickness of the built solid, read back from the sampled
// fields rather than taken from the design value: from sample points on the
// mesh, march into the material against the surface normal until the solid
// field turns positive again. The distance travelled is the local material
// thickness along the normal (an upper bound on the true local minimum
// thickness, exact for a flat wall).

import type { GridFrame } from './grid';

export type SolidSampler = (x: number, y: number, z: number) => number;

/** Trilinear interpolation of a grid array. Outside the grid: +Infinity. */
export function trilinear(g: GridFrame, a: Float32Array, x: number, y: number, z: number): number {
  const fx = (x - g.origin[0]) / g.h, fy = (y - g.origin[1]) / g.h, fz = (z - g.origin[2]) / g.h;
  const i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz);
  if (i < 0 || j < 0 || k < 0 || i >= g.nx - 1 || j >= g.ny - 1 || k >= g.nz - 1) return Infinity;
  const tx = fx - i, ty = fy - j, tz = fz - k;
  const sx = 1, sy = g.nx, sz = g.nx * g.ny;
  const b = i + g.nx * (j + g.ny * k);
  const c00 = a[b] + (a[b + sx] - a[b]) * tx;
  const c10 = a[b + sy] + (a[b + sy + sx] - a[b + sy]) * tx;
  const c01 = a[b + sz] + (a[b + sz + sx] - a[b + sz]) * tx;
  const c11 = a[b + sz + sy] + (a[b + sz + sy + sx] - a[b + sz + sy]) * tx;
  const c0 = c00 + (c10 - c00) * ty, c1 = c01 + (c11 - c01) * ty;
  return c0 + (c1 - c0) * tz;
}

export interface ThicknessStats {
  samples: number;
  minMm: number;
  p5Mm: number;
  medianMm: number;
}

/** March from triangle centroids (every `stride`-th of [from, to)) inward. */
export function measureThickness(
  positions: Float32Array,
  indices: Uint32Array,
  range: { from: number; to: number },
  solid: SolidSampler,
  step: number,
  maxSamples = 3000,
  maxDepth = 50,
): ThicknessStats | undefined {
  const tris = (range.to - range.from) / 3;
  if (tris <= 0) return undefined;
  const stride = Math.max(1, Math.floor(tris / maxSamples));
  const out: number[] = [];
  for (let t = range.from; t < range.to; t += 3 * stride) {
    const d = thicknessAt(positions, indices, t, solid, step, maxDepth);
    if (d !== undefined) out.push(d);
  }
  if (out.length === 0) return undefined;
  out.sort((a, b) => a - b);
  const q = (p: number): number => out[Math.min(out.length - 1, Math.floor(p * out.length))];
  return { samples: out.length, minMm: out[0], p5Mm: q(0.05), medianMm: q(0.5) };
}

function thicknessAt(
  P: Float32Array, I: Uint32Array, t: number, solid: SolidSampler, step: number, maxDepth: number,
): number | undefined {
  const a = 3 * I[t], b = 3 * I[t + 1], c = 3 * I[t + 2];
  const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
  const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz);
  if (len === 0) return undefined;
  nx /= len; ny /= len; nz /= len;
  const ox = (P[a] + P[b] + P[c]) / 3, oy = (P[a + 1] + P[b + 1] + P[c + 1]) / 3, oz = (P[a + 2] + P[b + 2] + P[c + 2]) / 3;
  let prev = solid(ox - nx * step, oy - ny * step, oz - nz * step);
  if (!(prev < 0)) return undefined;
  for (let s = 2 * step; s <= maxDepth; s += step) {
    const v = solid(ox - nx * s, oy - ny * s, oz - nz * s);
    if (v >= 0) {
      // Linear crossing between the last two samples.
      return s - step + step * (-prev / (v - prev));
    }
    prev = v;
  }
  return undefined;
}
