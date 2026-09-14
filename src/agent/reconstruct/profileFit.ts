// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/reconstruct/profileFit.ts
//
// Section loop → exact 2D profile: full circles, or closed chains of lines and
// circular arcs, with corners rebuilt from the fitted geometry (line/line
// intersections, tangent points) instead of the tessellated vertices, then
// optionally snapped: near-orthogonal line directions onto exact multiples of
// 90°, and coordinates / radii onto a round grid within a tolerance. Every
// snap is recorded so the caller can put it in the assumption ledger.

import { fitCircle2D, fitLine2D, polygonSignedArea, type V2 } from './geom';

export interface LineGeom {
  kind: 'line';
  px: number;
  py: number;
  dx: number;
  dy: number;
}

export interface ArcGeom {
  kind: 'arc';
  cx: number;
  cy: number;
  r: number;
  /** Traversal direction along the loop. */
  ccw: boolean;
}

export interface ProfileSegment {
  geom: LineGeom | ArcGeom;
  /** Measured point indices [first, last] into the loop's point list (last may wrap). */
  first: number;
  last: number;
  /** Geometry came from a segmented surface region, not from these points. */
  fixed?: boolean;
}

/** Exact section geometry of a segmented surface region, when it has one. */
export type RegionSection = { kind: 'line'; px: number; py: number; dx: number; dy: number } | { kind: 'circle'; cx: number; cy: number; r: number };

/**
 * Which surface region produced each section segment. A planar wall's trace is
 * an exact line and a coaxial cylinder's an exact circle, whatever the point
 * sampling looks like, so labelled runs are taken from the segmentation and
 * only unlabelled runs are fitted from points.
 */
export interface LoopGuide {
  /** Region label of the segment from point i to point i + 1 (0 = none). */
  labels: ArrayLike<number>;
  geometry(label: number): RegionSection | undefined;
}

export type FittedLoop =
  | { kind: 'circle'; cx: number; cy: number; r: number; hole: boolean; rms: number }
  | { kind: 'path'; segments: ProfileSegment[]; hole: boolean; points: Float64Array };

/** A primitive of the final, closed profile. `a` = start, `b` = end. */
export type ProfilePrim =
  | { kind: 'line'; a: V2; b: V2 }
  | { kind: 'arc'; a: V2; b: V2; c: V2; r: number; ccw: boolean };

export interface SnapRecord {
  what: string;
  measured: number;
  value: number;
  grid: number;
}

const DEG = Math.PI / 180;

function dedupe(xy: ArrayLike<number>, minDist: number, labelsIn?: ArrayLike<number>): { pts: Float64Array; labels: number[] } {
  const out: number[] = [];
  const labels: number[] = [];
  const n = xy.length / 2;
  for (let i = 0; i < n; i++) {
    const x = xy[2 * i], y = xy[2 * i + 1];
    const lab = labelsIn ? labelsIn[i] : 0;
    if (out.length >= 2) {
      const px = out[out.length - 2], py = out[out.length - 1];
      if (Math.hypot(x - px, y - py) < minDist) {
        // The merged segment keeps whichever label is informative.
        if (labels[labels.length - 1] === 0) labels[labels.length - 1] = lab;
        continue;
      }
    }
    out.push(x, y);
    labels.push(lab);
  }
  while (out.length >= 4 && Math.hypot(out[0] - out[out.length - 2], out[1] - out[out.length - 1]) < minDist) {
    out.length -= 2;
    labels.pop();
  }
  return { pts: Float64Array.from(out), labels };
}

function angularCoverage(xy: ArrayLike<number>, cx: number, cy: number): number {
  const n = xy.length / 2;
  const angles = Array.from({ length: n }, (_, i) => Math.atan2(xy[2 * i + 1] - cy, xy[2 * i] - cx)).sort((a, b) => a - b);
  if (angles.length === 0) return 0;
  let maxGap = angles[0] + 2 * Math.PI - angles[angles.length - 1];
  for (let i = 1; i < angles.length; i++) maxGap = Math.max(maxGap, angles[i] - angles[i - 1]);
  return 2 * Math.PI - maxGap;
}

/** Points [i..j] (inclusive, j may exceed n and wraps) of a closed loop. */
function range(pts: Float64Array, i: number, j: number): Float64Array {
  const n = pts.length / 2;
  const out = new Float64Array((j - i + 1) * 2);
  for (let k = i; k <= j; k++) {
    const m = ((k % n) + n) % n;
    out[(k - i) * 2] = pts[2 * m];
    out[(k - i) * 2 + 1] = pts[2 * m + 1];
  }
  return out;
}

function chordFits(r: Float64Array, eps: number): boolean {
  const n = r.length / 2;
  const ax = r[0], ay = r[1], bx = r[2 * (n - 1)], by = r[2 * (n - 1) + 1];
  const ex = bx - ax, ey = by - ay;
  const len = Math.hypot(ex, ey);
  if (len < 1e-12) return n <= 2;
  for (let k = 1; k < n - 1; k++) {
    const t = ((r[2 * k] - ax) * ex + (r[2 * k + 1] - ay) * ey) / (len * len);
    if (t < -1e-9 || t > 1 + 1e-9) return false;
    const d = Math.abs((r[2 * k] - ax) * ey - (r[2 * k + 1] - ay) * ex) / len;
    if (d > eps) return false;
  }
  return true;
}

function arcFits(r: Float64Array, eps: number, maxRadius = Infinity): { cx: number; cy: number; r: number; ccw: boolean; span: number } | null {
  const n = r.length / 2;
  if (n < 4) return null;
  const fit = fitCircle2D(r);
  // A profile arc larger than the loop itself is a nearly straight run of
  // points bending inside the tolerance, not a design arc.
  if (!fit || fit.maxResidual > eps || fit.r > maxRadius) return null;
  let total = 0;
  let sign = 0;
  let prev = Math.atan2(r[1] - fit.cy, r[0] - fit.cx);
  for (let k = 1; k < n; k++) {
    const a = Math.atan2(r[2 * k + 1] - fit.cy, r[2 * k] - fit.cx);
    let d = a - prev;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    if (Math.abs(d) > 60 * DEG || Math.abs(d) < 1e-12) return null;
    const s = Math.sign(d);
    if (sign !== 0 && s !== sign) return null;
    sign = s;
    total += d;
    prev = a;
  }
  if (Math.abs(total) >= 2 * Math.PI - 1e-6) return null;
  return { cx: fit.cx, cy: fit.cy, r: fit.r, ccw: total > 0, span: Math.abs(total) };
}

/** Largest e in (lo, hi] with ok(e) true, assuming ok is (nearly) monotone. */
function extend(lo: number, hi: number, ok: (e: number) => boolean): number {
  let good = lo;
  let step = 1;
  let e = lo + 1;
  while (e <= hi && ok(e)) {
    good = e;
    step *= 2;
    e = Math.min(hi, lo + step);
    if (e === good) break;
  }
  let bad = Math.min(hi + 1, e);
  if (bad <= good) return good;
  while (bad - good > 1) {
    const mid = (good + bad) >> 1;
    if (ok(mid)) good = mid;
    else bad = mid;
  }
  return good;
}

/** Greedy line/arc segmentation of points [i0, i1] of a (rotated) loop. */
function greedySegments(pts: Float64Array, i0: number, i1: number, eps: number, maxRadius: number): ProfileSegment[] {
  const segments: ProfileSegment[] = [];
  let i = i0;
  while (i < i1) {
    const j = extend(i, i1, (e) => chordFits(range(pts, i, e), eps));
    let k = i;
    let arc: ReturnType<typeof arcFits> = null;
    if (i + 3 <= i1) {
      k = extend(i + 2, i1, (e) => e >= i + 3 && arcFits(range(pts, i, e), eps, maxRadius) !== null);
      if (k >= i + 3) arc = arcFits(range(pts, i, k), eps, maxRadius);
    }
    if (arc && k > j && sagittaOk(arc.r, arc.span, eps)) {
      segments.push({ geom: { kind: 'arc', cx: arc.cx, cy: arc.cy, r: arc.r, ccw: arc.ccw }, first: i, last: k });
      i = k;
    } else {
      const end = Math.max(j, i + 1);
      segments.push({ geom: lineGeomOf(range(pts, i, end)), first: i, last: end });
      i = end;
    }
  }
  return segments;
}

/** Fit one closed section loop. `eps` is the max point deviation (mm). */
export function fitLoop(xyIn: ArrayLike<number>, eps: number, guide?: LoopGuide): FittedLoop {
  const { pts, labels: rawLabels } = dedupe(xyIn, Math.max(1e-7, eps * 0.01), guide?.labels);
  const n = pts.length / 2;
  const hole = polygonSignedArea(pts) < 0;
  if (n >= 6) {
    const cf = fitCircle2D(pts);
    // RMS within eps and no point beyond 2.5 eps: a noisy scan of a bore is
    // still a circle, while a polygon's corners stick out well past that.
    if (cf && cf.rms <= eps && cf.maxResidual <= 2.5 * eps && angularCoverage(pts, cf.cx, cf.cy) >= 350 * DEG && sagittaOk(cf.r, 2 * Math.PI, eps)) {
      return { kind: 'circle', cx: cf.cx, cy: cf.cy, r: cf.r, hole, rms: cf.rms };
    }
  }
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (let q = 0; q < n; q++) {
    bx0 = Math.min(bx0, pts[2 * q]);
    bx1 = Math.max(bx1, pts[2 * q]);
    by0 = Math.min(by0, pts[2 * q + 1]);
    by1 = Math.max(by1, pts[2 * q + 1]);
  }
  const maxRadius = Math.hypot(bx1 - bx0, by1 - by0);
  const labels = rawLabels.map((l) => (guide && l !== 0 && guide.geometry(l) ? l : 0));
  const boundary = labels.findIndex((l, i) => l !== labels[(i - 1 + n) % n]);

  if (guide && boundary >= 0 && labels.some((l) => l !== 0)) {
    // Walk runs of equally labelled segments, starting on a run boundary.
    const rotated = range(pts, boundary, boundary + n - 1);
    const lab = Array.from({ length: n }, (_, i) => labels[(boundary + i) % n]);
    const segments: ProfileSegment[] = [];
    let a = 0;
    while (a < n) {
      let b = a;
      while (b + 1 < n && lab[b + 1] === lab[a]) b++;
      const first = a;
      const last = b + 1;
      const geom = lab[a] !== 0 ? guide.geometry(lab[a]) : undefined;
      if (geom && geom.kind === 'line') {
        const tx = rotated[2 * (last % n)] - rotated[2 * first];
        const ty = rotated[2 * (last % n) + 1] - rotated[2 * first + 1];
        const sgn = geom.dx * tx + geom.dy * ty >= 0 ? 1 : -1;
        // Direction from the wall plane; offset from the section it cuts (a
        // plane fit can tilt a little where it borders a round), weighted by
        // length: a sparse tessellated wall is one long chord, and the short
        // chord of a blend facet grown into the region must not pull it.
        let ox = 0;
        let oy = 0;
        let wsum = 0;
        for (let q = first; q < last; q++) {
          const ax = rotated[2 * (q % n)], ay = rotated[2 * (q % n) + 1];
          const bx = rotated[2 * ((q + 1) % n)], by = rotated[2 * ((q + 1) % n) + 1];
          const w = Math.hypot(bx - ax, by - ay);
          ox += (w * (ax + bx)) / 2;
          oy += (w * (ay + by)) / 2;
          wsum += w;
        }
        if (wsum <= 1e-12) {
          ox = rotated[2 * first];
          oy = rotated[2 * first + 1];
          wsum = 1;
        }
        segments.push({ geom: { kind: 'line', px: ox / wsum, py: oy / wsum, dx: geom.dx * sgn, dy: geom.dy * sgn }, first, last, fixed: true });
      } else if (geom && geom.kind === 'circle') {
        let sweep = 0;
        let prev = Math.atan2(rotated[2 * first + 1] - geom.cy, rotated[2 * first] - geom.cx);
        for (let q = first + 1; q <= last; q++) {
          const m = q % n;
          const ang = Math.atan2(rotated[2 * m + 1] - geom.cy, rotated[2 * m] - geom.cx);
          let d = ang - prev;
          while (d > Math.PI) d -= 2 * Math.PI;
          while (d < -Math.PI) d += 2 * Math.PI;
          sweep += d;
          prev = ang;
        }
        segments.push({ geom: { kind: 'arc', cx: geom.cx, cy: geom.cy, r: geom.r, ccw: sweep >= 0 }, first, last, fixed: true });
      } else {
        segments.push(...greedySegments(rotated, first, last, eps, maxRadius));
      }
      a = b + 1;
    }
    mergeCollinear(rotated, segments, eps);
    refineSegments(rotated, segments);
    return { kind: 'path', segments, hole, points: rotated };
  }

  // Start at the sharpest corner so no primitive straddles the seam.
  let start = 0;
  let sharpest = -1;
  for (let i = 0; i < n; i++) {
    const p = (i - 1 + n) % n, q = (i + 1) % n;
    const ux = pts[2 * i] - pts[2 * p], uy = pts[2 * i + 1] - pts[2 * p + 1];
    const vx = pts[2 * q] - pts[2 * i], vy = pts[2 * q + 1] - pts[2 * i + 1];
    const turn = Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy));
    if (turn > sharpest) {
      sharpest = turn;
      start = i;
    }
  }
  const rotated = range(pts, start, start + n - 1);
  const segments = greedySegments(rotated, 0, n, eps, maxRadius);
  mergeSeam(rotated, segments, eps, maxRadius);
  mergeCollinear(rotated, segments, eps);
  refineSegments(rotated, segments);
  return { kind: 'path', segments, hole, points: rotated };
}

function sagittaOk(r: number, span: number, eps: number): boolean {
  const s = r * (1 - Math.cos(Math.min(span, Math.PI) / 2));
  return s > 2 * eps;
}

function lineGeomOf(r: Float64Array): LineGeom {
  const fit = fitLine2D(r)!;
  const n = r.length / 2;
  // Orient along the traversal.
  const tx = r[2 * (n - 1)] - r[0], ty = r[2 * (n - 1) + 1] - r[1];
  const s = fit.dx * tx + fit.dy * ty >= 0 ? 1 : -1;
  return { kind: 'line', px: fit.px, py: fit.py, dx: fit.dx * s, dy: fit.dy * s };
}

/** Join neighbouring lines whose combined points still fit one chord. */
function mergeCollinear(pts: Float64Array, segs: ProfileSegment[], eps: number): void {
  let changed = true;
  while (changed && segs.length > 1) {
    changed = false;
    for (let k = 0; k < segs.length; k++) {
      const a = segs[k];
      const bi = (k + 1) % segs.length;
      const b = segs[bi];
      if (a.geom.kind !== 'line' || b.geom.kind !== 'line' || bi === k || a.fixed || b.fixed) continue;
      const n = pts.length / 2;
      const last = bi === 0 ? b.last + n : b.last;
      if (!chordFits(range(pts, a.first, last), eps)) continue;
      segs[k] = { geom: lineGeomOf(range(pts, a.first, last)), first: a.first, last };
      segs.splice(bi, 1);
      if (bi === 0) {
        // The merged segment now wraps the seam; keep indices consistent.
        const head = segs.pop()!;
        segs.unshift({ ...head, first: head.first - n, last: head.last - n });
      }
      changed = true;
      break;
    }
  }
}

function mergeSeam(pts: Float64Array, segs: ProfileSegment[], eps: number, maxRadius: number): void {
  if (segs.length < 2) return;
  const first = segs[0];
  const last = segs[segs.length - 1];
  const n = pts.length / 2;
  const combined = range(pts, last.first, n + first.last);
  if (first.geom.kind === 'line' && last.geom.kind === 'line' && chordFits(combined, eps)) {
    segs[0] = { geom: lineGeomOf(combined), first: last.first - n, last: first.last };
    segs.pop();
  } else if (first.geom.kind === 'arc' && last.geom.kind === 'arc') {
    const arc = arcFits(combined, eps, maxRadius);
    if (arc) {
      segs[0] = { geom: { kind: 'arc', cx: arc.cx, cy: arc.cy, r: arc.r, ccw: arc.ccw }, first: last.first - n, last: first.last };
      segs.pop();
    }
  }
}

function refineSegments(pts: Float64Array, segs: ProfileSegment[]): void {
  for (const s of segs) {
    if (s.fixed) continue;
    const r = range(pts, s.first, s.last);
    if (s.geom.kind === 'line') s.geom = lineGeomOf(r);
    else {
      const fit = fitCircle2D(r);
      if (fit) s.geom = { kind: 'arc', cx: fit.cx, cy: fit.cy, r: fit.r, ccw: s.geom.ccw };
    }
  }
}

// ---------------------------------------------------------------------------
// Snapping
// ---------------------------------------------------------------------------

export const SNAP_GRIDS = [1, 0.5, 0.1] as const;

/** Snap `v` to the coarsest grid within `tol`; otherwise round to 0.001. */
export function snapValue(v: number, tol: number): { value: number; grid: number; snapped: boolean } {
  if (tol > 0) {
    for (const g of SNAP_GRIDS) {
      const s = Math.round(v / g) * g;
      if (Math.abs(s - v) <= tol) return { value: roundTo(s, 1e-6), grid: g, snapped: Math.abs(s - v) > 1e-9 };
    }
  }
  return { value: roundTo(v, 1e-3), grid: 0.001, snapped: false };
}

export function roundTo(v: number, q: number): number {
  const r = Math.round(v / q) * q;
  return Math.abs(r) < q / 2 ? 0 : Number(r.toFixed(Math.max(0, Math.ceil(-Math.log10(q)))));
}

export interface SnapOptions {
  /** Coordinate / radius snap tolerance (mm). 0 disables grid snapping. */
  tol: number;
  /** Snap line directions within this many degrees of a 90° multiple. 0 disables. */
  angleTolDeg: number;
  /** Label prefix for snap records. */
  label: string;
}

/** Snap a fitted loop in place and return the snaps applied. */
export function snapLoop(loop: FittedLoop, opts: SnapOptions): SnapRecord[] {
  const records: SnapRecord[] = [];
  const rec = (what: string, measured: number, s: { value: number; grid: number; snapped: boolean }) => {
    if (s.snapped) records.push({ what: `${opts.label}.${what}`, measured, value: s.value, grid: s.grid });
    return s.value;
  };
  if (loop.kind === 'circle') {
    const d = rec('diameter', 2 * loop.r, snapValue(2 * loop.r, opts.tol));
    loop.r = d / 2;
    loop.cx = rec('cx', loop.cx, snapValue(loop.cx, opts.tol));
    loop.cy = rec('cy', loop.cy, snapValue(loop.cy, opts.tol));
    return records;
  }
  loop.segments.forEach((seg, idx) => {
    if (seg.geom.kind !== 'line') return;
    const g = seg.geom;
    if (opts.angleTolDeg > 0) {
      const ang = Math.atan2(g.dy, g.dx);
      const q = Math.round(ang / (Math.PI / 2)) * (Math.PI / 2);
      if (Math.abs(ang - q) <= opts.angleTolDeg * DEG) {
        g.dx = Math.round(Math.cos(q));
        g.dy = Math.round(Math.sin(q));
        // Least-squares offset with the direction fixed.
        const r = range(loop.points, seg.first, seg.last);
        const cnt = r.length / 2;
        let sx = 0, sy = 0;
        for (let k = 0; k < cnt; k++) {
          sx += r[2 * k];
          sy += r[2 * k + 1];
        }
        g.px = sx / cnt;
        g.py = sy / cnt;
      }
    }
    if (g.dx === 0) g.px = rec(`line${idx}.x`, g.px, snapValue(g.px, opts.tol));
    if (g.dy === 0) g.py = rec(`line${idx}.y`, g.py, snapValue(g.py, opts.tol));
  });
  loop.segments.forEach((seg, idx) => {
    if (seg.geom.kind !== 'arc') return;
    const g = seg.geom;
    g.r = rec(`arc${idx}.r`, g.r, snapValue(g.r, opts.tol));
    const n = loop.segments.length;
    const prev = loop.segments[(idx - 1 + n) % n].geom;
    const next = loop.segments[(idx + 1) % n].geom;
    const tangentCenter = prev.kind === 'line' && next.kind === 'line' ? filletCenter(prev, next, g) : null;
    if (tangentCenter) {
      g.cx = tangentCenter[0];
      g.cy = tangentCenter[1];
    } else {
      g.cx = rec(`arc${idx}.cx`, g.cx, snapValue(g.cx, opts.tol));
      g.cy = rec(`arc${idx}.cy`, g.cy, snapValue(g.cy, opts.tol));
    }
  });
  return records;
}

/** Centre of a radius-r arc tangent to both lines, on the side the measured
 *  centre lies; null when the arc is not tangent to both. */
function filletCenter(l1: LineGeom, l2: LineGeom, arc: ArcGeom): V2 | null {
  const side = (l: LineGeom) => {
    const nx = -l.dy, ny = l.dx;
    const dist = (arc.cx - l.px) * nx + (arc.cy - l.py) * ny;
    return { nx, ny, dist };
  };
  const s1 = side(l1), s2 = side(l2);
  const tolT = Math.max(0.05 * arc.r, 0.05);
  if (Math.abs(Math.abs(s1.dist) - arc.r) > tolT || Math.abs(Math.abs(s2.dist) - arc.r) > tolT) return null;
  const o1 = { px: l1.px + s1.nx * Math.sign(s1.dist) * arc.r, py: l1.py + s1.ny * Math.sign(s1.dist) * arc.r, dx: l1.dx, dy: l1.dy };
  const o2 = { px: l2.px + s2.nx * Math.sign(s2.dist) * arc.r, py: l2.py + s2.ny * Math.sign(s2.dist) * arc.r, dx: l2.dx, dy: l2.dy };
  return lineIntersection(o1, o2);
}

function lineIntersection(
  a: { px: number; py: number; dx: number; dy: number },
  b: { px: number; py: number; dx: number; dy: number },
): V2 | null {
  const den = a.dx * b.dy - a.dy * b.dx;
  if (Math.abs(den) < Math.sin(0.5 * DEG)) return null;
  const t = ((b.px - a.px) * b.dy - (b.py - a.py) * b.dx) / den;
  return [a.px + t * a.dx, a.py + t * a.dy];
}

// ---------------------------------------------------------------------------
// Joints → closed primitive chain
// ---------------------------------------------------------------------------

function footOnLine(l: LineGeom, x: number, y: number): V2 {
  const t = (x - l.px) * l.dx + (y - l.py) * l.dy;
  return [l.px + t * l.dx, l.py + t * l.dy];
}

function nearest(cands: V2[], ref: V2): V2 {
  let best = cands[0];
  let bd = Infinity;
  for (const c of cands) {
    const d = Math.hypot(c[0] - ref[0], c[1] - ref[1]);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best;
}

function lineCircle(l: LineGeom, a: ArcGeom, ref: V2): V2 {
  const foot = footOnLine(l, a.cx, a.cy);
  const h = Math.hypot(foot[0] - a.cx, foot[1] - a.cy);
  if (Math.abs(h - a.r) <= Math.max(0.02 * a.r, 0.02) || h >= a.r) return foot;
  const half = Math.sqrt(a.r * a.r - h * h);
  return nearest(
    [
      [foot[0] + l.dx * half, foot[1] + l.dy * half],
      [foot[0] - l.dx * half, foot[1] - l.dy * half],
    ],
    ref,
  );
}

function circleCircle(a: ArcGeom, b: ArcGeom, ref: V2): V2 {
  const dx = b.cx - a.cx, dy = b.cy - a.cy;
  const d = Math.hypot(dx, dy);
  if (d < 1e-9) return ref;
  const ux = dx / d, uy = dy / d;
  const tangentTol = Math.max(0.02 * Math.min(a.r, b.r), 0.02);
  if (Math.abs(d - (a.r + b.r)) <= tangentTol || d > a.r + b.r) return [a.cx + ux * a.r, a.cy + uy * a.r];
  if (Math.abs(d - Math.abs(a.r - b.r)) <= tangentTol || d < Math.abs(a.r - b.r)) {
    const s = a.r >= b.r ? 1 : -1;
    return [a.cx + ux * a.r * s, a.cy + uy * a.r * s];
  }
  const along = (d * d + a.r * a.r - b.r * b.r) / (2 * d);
  const h = Math.sqrt(Math.max(0, a.r * a.r - along * along));
  const mx = a.cx + ux * along, my = a.cy + uy * along;
  return nearest(
    [
      [mx - uy * h, my + ux * h],
      [mx + uy * h, my - ux * h],
    ],
    ref,
  );
}

function joint(g1: LineGeom | ArcGeom, g2: LineGeom | ArcGeom, ref: V2): V2 {
  if (g1.kind === 'line' && g2.kind === 'line') return lineIntersection(g1, g2) ?? footOnLine(g2, ref[0], ref[1]);
  if (g1.kind === 'line' && g2.kind === 'arc') return lineCircle(g1, g2, ref);
  if (g1.kind === 'arc' && g2.kind === 'line') return lineCircle(g2, g1, ref);
  return circleCircle(g1 as ArcGeom, g2 as ArcGeom, ref);
}

/** Closed primitive chain for a path loop (after optional snapping). */
export function loopPrimitives(loop: Extract<FittedLoop, { kind: 'path' }>): ProfilePrim[] {
  const segs = loop.segments;
  const n = segs.length;
  const count = loop.points.length / 2;
  const at = (k: number): V2 => {
    const m = ((k % count) + count) % count;
    return [loop.points[2 * m], loop.points[2 * m + 1]];
  };
  const joints: V2[] = [];
  for (let k = 0; k < n; k++) {
    const prev = segs[(k - 1 + n) % n];
    joints.push(joint(prev.geom, segs[k].geom, at(segs[k].first)));
  }
  const prims: ProfilePrim[] = [];
  for (let k = 0; k < n; k++) {
    const a = joints[k];
    const b = joints[(k + 1) % n];
    const g = segs[k].geom;
    if (g.kind === 'line') prims.push({ kind: 'line', a, b });
    else prims.push({ kind: 'arc', a, b, c: [g.cx, g.cy], r: g.r, ccw: g.ccw });
  }
  return prims.filter((p) => Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]) > 1e-6);
}

/** Point on an arc half-way along its traversal from a to b. */
export function arcMidpoint(p: Extract<ProfilePrim, { kind: 'arc' }>): V2 {
  const a0 = Math.atan2(p.a[1] - p.c[1], p.a[0] - p.c[0]);
  const a1 = Math.atan2(p.b[1] - p.c[1], p.b[0] - p.c[0]);
  let sweep = a1 - a0;
  if (p.ccw) {
    while (sweep <= 0) sweep += 2 * Math.PI;
  } else {
    while (sweep >= 0) sweep -= 2 * Math.PI;
  }
  const m = a0 + sweep / 2;
  return [p.c[0] + p.r * Math.cos(m), p.c[1] + p.r * Math.sin(m)];
}

/**
 * Exact signed area moments of a closed line/arc chain: the chord polygon
 * through the joints plus, per arc, its circular segment — added when the arc
 * runs counter-clockwise about its centre, subtracted otherwise (Green's
 * theorem over arc + reversed chord). Returns the absolute area.
 */
export function primitivesMoments(prims: ProfilePrim[]): { area: number; cx: number; cy: number } {
  let a2 = 0;
  let sx = 0;
  let sy = 0;
  for (const p of prims) {
    const cr = p.a[0] * p.b[1] - p.b[0] * p.a[1];
    a2 += cr;
    sx += (p.a[0] + p.b[0]) * cr;
    sy += (p.a[1] + p.b[1]) * cr;
  }
  let area = a2 / 2;
  let mx = sx / 6;
  let my = sy / 6;
  for (const p of prims) {
    if (p.kind !== 'arc') continue;
    const a0 = Math.atan2(p.a[1] - p.c[1], p.a[0] - p.c[0]);
    const a1 = Math.atan2(p.b[1] - p.c[1], p.b[0] - p.c[0]);
    let sweep = a1 - a0;
    if (p.ccw) {
      while (sweep <= 0) sweep += 2 * Math.PI;
    } else {
      while (sweep >= 0) sweep -= 2 * Math.PI;
    }
    const theta = Math.abs(sweep);
    const segArea = ((p.r * p.r) / 2) * (theta - Math.sin(theta));
    if (segArea <= 0) continue;
    const half = theta / 2;
    const dist = (4 * p.r * Math.sin(half) ** 3) / (3 * (theta - Math.sin(theta)));
    const mid = a0 + sweep / 2;
    const gx = p.c[0] + dist * Math.cos(mid);
    const gy = p.c[1] + dist * Math.sin(mid);
    const sign = p.ccw ? 1 : -1;
    area += sign * segArea;
    mx += sign * segArea * gx;
    my += sign * segArea * gy;
  }
  if (Math.abs(area) < 1e-300) return { area: 0, cx: 0, cy: 0 };
  return { area: Math.abs(area), cx: mx / area, cy: my / area };
}

/** Dense polygon (flat xy) of a primitive chain — for point tests. */
export function primitivesToPolygon(prims: ProfilePrim[], arcStepRad = 1 * DEG): Float64Array {
  const out: number[] = [];
  for (const p of prims) {
    out.push(p.a[0], p.a[1]);
    if (p.kind === 'arc') {
      const a0 = Math.atan2(p.a[1] - p.c[1], p.a[0] - p.c[0]);
      const a1 = Math.atan2(p.b[1] - p.c[1], p.b[0] - p.c[0]);
      let sweep = a1 - a0;
      if (p.ccw) {
        while (sweep <= 0) sweep += 2 * Math.PI;
      } else {
        while (sweep >= 0) sweep -= 2 * Math.PI;
      }
      const steps = Math.max(2, Math.ceil(Math.abs(sweep) / arcStepRad));
      for (let s = 1; s < steps; s++) {
        const t = a0 + (sweep * s) / steps;
        out.push(p.c[0] + p.r * Math.cos(t), p.c[1] + p.r * Math.sin(t));
      }
    }
  }
  return Float64Array.from(out);
}

export function circleToPolygon(cx: number, cy: number, r: number, ccw: boolean, steps = 180): Float64Array {
  const out = new Float64Array(steps * 2);
  for (let s = 0; s < steps; s++) {
    const t = ((ccw ? 1 : -1) * 2 * Math.PI * s) / steps;
    out[2 * s] = cx + r * Math.cos(t);
    out[2 * s + 1] = cy + r * Math.sin(t);
  }
  return out;
}
