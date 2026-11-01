// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/cfd/meshGeom.ts
//
// Small triangle-soup geometry used by the CFD case builder: ASCII STL
// regions, a parity point-in-solid test (the OCCT bindings shipped here do
// not expose a solid classifier), patch area / centroid / normal, and the
// projected frontal area used as the drag reference area.

import type { Vec3 } from './types';

/** A closed or open triangle soup, mm. */
export interface TriSoup {
  vertices: number[];
  triangles: number[];
}

export function mergeSoups(soups: readonly TriSoup[]): TriSoup {
  const vertices: number[] = [];
  const triangles: number[] = [];
  for (const s of soups) {
    const base = vertices.length / 3;
    vertices.push(...s.vertices);
    for (const t of s.triangles) triangles.push(t + base);
  }
  return { vertices, triangles };
}

const at = (s: TriSoup, i: number): Vec3 => [s.vertices[3 * i], s.vertices[3 * i + 1], s.vertices[3 * i + 2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function* tris(s: TriSoup): Generator<[Vec3, Vec3, Vec3]> {
  for (let i = 0; i + 2 < s.triangles.length; i += 3) {
    yield [at(s, s.triangles[i]), at(s, s.triangles[i + 1]), at(s, s.triangles[i + 2])];
  }
}

/** ASCII STL `solid <name>` block, coordinates scaled by `scale`. */
export function stlSolid(name: string, soup: TriSoup, scale: number): string {
  const lines = [`solid ${name}`];
  const f = (v: number): string => (v * scale).toExponential(9);
  for (const [a, b, c] of tris(soup)) {
    const nrm = cross(sub(b, a), sub(c, a));
    const len = Math.hypot(...nrm) || 1;
    lines.push(`  facet normal ${nrm.map(x => (x / len).toExponential(6)).join(' ')}`, '    outer loop');
    for (const v of [a, b, c]) lines.push(`      vertex ${f(v[0])} ${f(v[1])} ${f(v[2])}`);
    lines.push('    endloop', '  endfacet');
  }
  lines.push(`endsolid ${name}`);
  return lines.join('\n') + '\n';
}

/** Area (mm^2), area-weighted centroid and unit normal of a patch. */
export function patchStats(soup: TriSoup): { area: number; centroid: Vec3; normal: Vec3 } {
  let area = 0;
  const c: Vec3 = [0, 0, 0];
  const n: Vec3 = [0, 0, 0];
  for (const [a, b, d] of tris(soup)) {
    const cr = cross(sub(b, a), sub(d, a));
    const ar = Math.hypot(...cr) / 2;
    area += ar;
    for (let k = 0; k < 3; k++) {
      c[k] += (ar * (a[k] + b[k] + d[k])) / 3;
      n[k] += cr[k] / 2;
    }
  }
  const nl = Math.hypot(...n) || 1;
  return {
    area,
    centroid: area > 0 ? [c[0] / area, c[1] / area, c[2] / area] : [0, 0, 0],
    normal: [n[0] / nl, n[1] / nl, n[2] / nl],
  };
}

/** Möller–Trumbore ray / triangle hit distance, or undefined. */
function rayHit(o: Vec3, d: Vec3, a: Vec3, b: Vec3, c: Vec3): number | undefined {
  const e1 = sub(b, a);
  const e2 = sub(c, a);
  const p = cross(d, e2);
  const det = dot(e1, p);
  if (Math.abs(det) < 1e-14) return undefined;
  const inv = 1 / det;
  const s = sub(o, a);
  const u = dot(s, p) * inv;
  if (u < 0 || u > 1) return undefined;
  const q = cross(s, e1);
  const v = dot(d, q) * inv;
  if (v < 0 || u + v > 1) return undefined;
  const t = dot(e2, q) * inv;
  return t > 1e-9 ? t : undefined;
}

/** Parity point-in-closed-soup test along a skewed ray (two rays must agree). */
export function pointInside(soup: TriSoup, p: Vec3): boolean {
  const dirs: Vec3[] = [[0.5773, 0.5774, 0.5773], [-0.4472, 0.1, 0.8888]];
  const votes = dirs.map(d => {
    let hits = 0;
    for (const [a, b, c] of tris(soup)) if (rayHit(p, d, a, b, c) !== undefined) hits++;
    return hits % 2 === 1;
  });
  return votes[0] && votes[1];
}

/** Smallest distance from `p` to any soup vertex — a cheap clearance proxy. */
export function vertexClearance(soup: TriSoup, p: Vec3): number {
  let best = Infinity;
  for (let i = 0; i < soup.vertices.length; i += 3) {
    best = Math.min(best, Math.hypot(soup.vertices[i] - p[0], soup.vertices[i + 1] - p[1], soup.vertices[i + 2] - p[2]));
  }
  return best;
}

/** Bounding box of a soup, mm. */
export function soupBounds(soup: TriSoup): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < soup.vertices.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], soup.vertices[i + k]);
      max[k] = Math.max(max[k], soup.vertices[i + k]);
    }
  }
  return { min, max };
}

/**
 * Silhouette area of the soup projected along axis `axis` (0/1/2), mm^2,
 * by rasterizing every triangle onto an n x n grid over the projected bbox.
 */
export function projectedArea(soup: TriSoup, axis: 0 | 1 | 2, n = 400): number {
  const [i, j] = axis === 0 ? [1, 2] : axis === 1 ? [0, 2] : [0, 1];
  const b = soupBounds(soup);
  const w = (b.max[i] - b.min[i]) || 1;
  const h = (b.max[j] - b.min[j]) || 1;
  const grid = new Uint8Array(n * n);
  for (const [a, bb, c] of tris(soup)) {
    const P = [a, bb, c].map(v => [((v[i] - b.min[i]) / w) * n, ((v[j] - b.min[j]) / h) * n]);
    const x0 = Math.max(0, Math.floor(Math.min(P[0][0], P[1][0], P[2][0])));
    const x1 = Math.min(n - 1, Math.ceil(Math.max(P[0][0], P[1][0], P[2][0])));
    const y0 = Math.max(0, Math.floor(Math.min(P[0][1], P[1][1], P[2][1])));
    const y1 = Math.min(n - 1, Math.ceil(Math.max(P[0][1], P[1][1], P[2][1])));
    const area2 = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1]);
    if (Math.abs(area2) < 1e-12) continue;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const w0 = ((P[1][0] - px) * (P[2][1] - py) - (P[2][0] - px) * (P[1][1] - py)) / area2;
        const w1 = ((P[2][0] - px) * (P[0][1] - py) - (P[0][0] - px) * (P[2][1] - py)) / area2;
        if (w0 >= 0 && w1 >= 0 && w0 + w1 <= 1) grid[y * n + x] = 1;
      }
    }
  }
  let filled = 0;
  for (const g of grid) filled += g;
  return (filled / (n * n)) * w * h;
}
