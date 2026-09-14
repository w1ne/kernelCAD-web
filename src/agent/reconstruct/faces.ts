// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/reconstruct/faces.ts
//
// Planar-face bookkeeping for the emitter.
//
// `.hole()` / `.holes()` / `.cutout()` place features at (u, v) relative to
// the entry face's AREA CENTROID as the face exists when the feature runs, and
// `depth: 'through'` measures to the nearest anti-parallel face whose centroid
// lies near the bore line. Both depend on geometry the emitter is creating, so
// it tracks every planar face it will produce as a 2D region with area moments
// and updates them as material is removed — exactly for nested regions, by
// sampling when outlines touch or overlap.

import { distanceToPolygon, pointInPolygon, polygonMoments, type V2, type V3 } from './geom';

export type AxisLabel = 'Z' | '-Z' | 'X' | '-X' | 'Y' | '-Y';

/** A closed 2D region: dense outline for point tests, exact area moments. */
export interface Region {
  poly: Float64Array;
  area: number;
  cx: number;
  cy: number;
}

export function polygonRegion(poly: Float64Array): Region {
  const m = polygonMoments(poly);
  return { poly, area: Math.abs(m.area), cx: m.cx, cy: m.cy };
}

export interface FacePiece {
  id: number;
  normal: AxisLabel;
  /** Plane coordinate along the normal axis (canonical frame). */
  level: number;
  /** Outer boundary in the face's 2D coordinates (see `toFace2D`). */
  outer: Float64Array;
  /** Regions inside `outer` that are not part of this face at creation. */
  voids: Float64Array[];
  area: number;
  cx: number;
  cy: number;
  /** True when the moments were sampled rather than computed exactly. */
  approximate: boolean;
  /** Created by an emitted feature (a floor), not present on the base body. */
  created: boolean;
}

/** 2D face coordinates of a canonical-frame point for a face with this normal. */
export function toFace2D(normal: AxisLabel, p: V3): V2 {
  switch (normal) {
    case 'Z':
    case '-Z':
      return [p[0], p[1]];
    case 'X':
    case '-X':
      return [p[1], p[2]];
    case 'Y':
    case '-Y':
      return [p[0], p[2]];
  }
}

/** Canonical-frame point of a 2D face coordinate on the face plane. */
export function fromFace2D(normal: AxisLabel, level: number, q: V2): V3 {
  switch (normal) {
    case 'Z':
    case '-Z':
      return [q[0], q[1], level];
    case 'X':
    case '-X':
      return [level, q[0], q[1]];
    case 'Y':
    case '-Y':
      return [q[0], level, q[1]];
  }
}

export function oppositeLabel(n: AxisLabel): AxisLabel {
  return (n.startsWith('-') ? n.slice(1) : `-${n}`) as AxisLabel;
}

type Relation = 'inside' | 'outside' | 'contains' | 'overlap';

/** How polygon `b` sits relative to polygon `a`. */
export function relate(a: Float64Array, b: Float64Array, tol: number): Relation {
  const bn = b.length / 2;
  const an = a.length / 2;
  let bInside = 0;
  let minDist = Infinity;
  const stride = (n: number) => Math.max(1, Math.floor(n / 64));
  for (let i = 0; i < bn; i += stride(bn)) {
    const x = b[2 * i], y = b[2 * i + 1];
    if (pointInPolygon(x, y, a)) bInside++;
    minDist = Math.min(minDist, distanceToPolygon(x, y, a));
  }
  let aInside = 0;
  for (let i = 0; i < an; i += stride(an)) {
    const x = a[2 * i], y = a[2 * i + 1];
    if (pointInPolygon(x, y, b)) aInside++;
    minDist = Math.min(minDist, distanceToPolygon(x, y, b));
  }
  const bSamples = Math.ceil(bn / stride(bn));
  const aSamples = Math.ceil(an / stride(an));
  if (minDist > tol) {
    if (bInside === bSamples) return 'inside';
    if (aInside === aSamples) return 'contains';
    if (bInside === 0 && aInside === 0) return 'outside';
    return 'overlap';
  }
  // Touching outlines: identical regions mean "a is fully covered".
  const ma = Math.abs(polygonMoments(a).area);
  const mb = Math.abs(polygonMoments(b).area);
  if (Math.abs(ma - mb) <= Math.max(1e-6, 1e-3 * ma) && minDist <= tol) {
    let far = 0;
    for (let i = 0; i < bn; i += stride(bn)) far = Math.max(far, distanceToPolygon(b[2 * i], b[2 * i + 1], a));
    if (far <= tol) return 'contains';
  }
  return 'overlap';
}

function bbox(poly: Float64Array): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < poly.length; i += 2) {
    x0 = Math.min(x0, poly[i]);
    x1 = Math.max(x1, poly[i]);
    y0 = Math.min(y0, poly[i + 1]);
    y1 = Math.max(y1, poly[i + 1]);
  }
  return [x0, y0, x1, y1];
}

/** Area moments of `outer` minus `voids` by midpoint sampling. */
export function sampledMoments(outer: Float64Array, voids: Float64Array[], samples = 320): { area: number; cx: number; cy: number } {
  const [x0, y0, x1, y1] = bbox(outer);
  const cell = Math.max(x1 - x0, y1 - y0) / samples;
  if (!(cell > 0)) return { area: 0, cx: 0, cy: 0 };
  let n = 0, sx = 0, sy = 0;
  for (let y = y0 + cell / 2; y < y1; y += cell) {
    for (let x = x0 + cell / 2; x < x1; x += cell) {
      if (!pointInPolygon(x, y, outer)) continue;
      if (voids.some((v) => pointInPolygon(x, y, v))) continue;
      n++;
      sx += x;
      sy += y;
    }
  }
  if (n === 0) return { area: 0, cx: 0, cy: 0 };
  return { area: n * cell * cell, cx: sx / n, cy: sy / n };
}

export class FaceBook {
  readonly pieces: FacePiece[] = [];
  private readonly tol: number;

  constructor(tol: number) {
    this.tol = tol;
  }

  /** Add the face(s) formed by each minuend region minus the subtrahend regions. */
  addDifference(normal: AxisLabel, level: number, minuend: Region[], subtrahend: Region[], created = false): void {
    for (const ra of minuend) {
      const a = ra.poly;
      let area = ra.area;
      let sx = area * ra.cx;
      let sy = area * ra.cy;
      const voids: Float64Array[] = [];
      let approximate = false;
      let empty = false;
      for (const rb of subtrahend) {
        const rel = relate(a, rb.poly, this.tol);
        if (rel === 'outside') continue;
        if (rel === 'contains') {
          empty = true;
          break;
        }
        voids.push(rb.poly);
        if (rel === 'inside') {
          area -= rb.area;
          sx -= rb.area * rb.cx;
          sy -= rb.area * rb.cy;
        } else {
          approximate = true;
        }
      }
      if (empty) continue;
      let cx: number, cy: number;
      if (approximate) {
        const s = sampledMoments(a, voids);
        area = s.area;
        cx = s.cx;
        cy = s.cy;
      } else {
        cx = area > 0 ? sx / area : ra.cx;
        cy = area > 0 ? sy / area : ra.cy;
      }
      if (area <= Math.max(1e-6, this.tol * this.tol)) continue;
      this.pieces.push({ id: this.pieces.length, normal, level, outer: a, voids, area, cx, cy, approximate, created });
    }
  }

  /** Pieces on this plane whose region contains the 2D point. */
  find(normal: AxisLabel, level: number, q: V2, levelTol: number): FacePiece | undefined {
    return this.pieces.find(
      (p) =>
        p.normal === normal &&
        Math.abs(p.level - level) <= levelTol &&
        pointInPolygon(q[0], q[1], p.outer) &&
        !p.voids.some((v) => pointInPolygon(q[0], q[1], v)),
    );
  }

  /** How many pieces share this plane (a face query needs `near` when > 1). */
  countOnPlane(normal: AxisLabel, level: number, levelTol: number): number {
    return this.pieces.filter((p) => p.normal === normal && Math.abs(p.level - level) <= Math.max(levelTol, 1.0)).length;
  }

  /** Remove a region with known moments (area > 0) from a piece. */
  removeMoments(piece: FacePiece, area: number, cx: number, cy: number, region: Float64Array): void {
    const total = piece.area - area;
    if (total <= 1e-9) {
      piece.area = 0;
      return;
    }
    piece.cx = (piece.area * piece.cx - area * cx) / total;
    piece.cy = (piece.area * piece.cy - area * cy) / total;
    piece.area = total;
    piece.voids.push(region);
  }

  centroid3D(piece: FacePiece): V3 {
    return fromFace2D(piece.normal, piece.level, [piece.cx, piece.cy]);
  }

  /**
   * Emulate the hole lowerer's `'through'` back-face rule for an entry piece:
   * among faces anti-parallel to the entry whose centroid lies within
   * (diameter/2 + 1 mm) of the line through the entry centroid, the nearest
   * one ahead. Returns its distance, or undefined when none qualifies.
   */
  throughDepth(entry: FacePiece, diameter: number): number | undefined {
    const anti = oppositeLabel(entry.normal);
    const into = entry.normal.startsWith('-') ? 1 : -1;
    let best: number | undefined;
    for (const p of this.pieces) {
      if (p.normal !== anti || p.area <= 0) continue;
      const along = (p.level - entry.level) * into;
      if (along <= 1e-9) continue;
      const perp = Math.hypot(p.cx - entry.cx, p.cy - entry.cy);
      if (perp >= diameter / 2 + 1.0) continue;
      if (best === undefined || along < best) best = along;
    }
    return best;
  }
}
