// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/drawing/geometry2d.ts
//
// Plain 2D geometry for the drawing-to-CAD pipeline: circle fitting, segment
// splitting at junctions, the outer-boundary walk that turns a view's
// linework into its silhouette loop, arc recovery on that loop, and polygon
// rasterisation for silhouette comparison. No PDF, no kernel — numbers only.

export type P2 = readonly [number, number];

export interface Seg2 {
  a: P2;
  b: P2;
}

export interface BBox2 {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const dist = (p: P2, q: P2): number => Math.hypot(p[0] - q[0], p[1] - q[1]);

export function bboxOf(points: Iterable<P2>): BBox2 | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of points) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return x0 === Infinity ? null : { x0, y0, x1, y1 };
}

export function unionBBox(a: BBox2, b: BBox2): BBox2 {
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
}

/** Gap between two boxes (0 when they overlap or touch). */
export function bboxGap(a: BBox2, b: BBox2): number {
  const dx = Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1));
  const dy = Math.max(0, Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1));
  return Math.hypot(dx, dy);
}

/** Distance from `p` to segment `ab`, plus the clamped projection parameter. */
export function pointSegment(p: P2, a: P2, b: P2): { d: number; t: number } {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / len2));
  return { d: Math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy)), t };
}

/** Distance from `p` to the infinite line through `a` and `b`. */
export function pointLine(p: P2, a: P2, b: P2): number {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const len = Math.hypot(vx, vy);
  if (len === 0) return dist(p, a);
  return Math.abs((p[0] - a[0]) * vy - (p[1] - a[1]) * vx) / len;
}

export interface CircleFit {
  cx: number;
  cy: number;
  r: number;
  /** Largest |distance − r| over the fitted points. */
  maxResidual: number;
}

/** Algebraic (Kåsa) least-squares circle fit. Returns null for < 3 or collinear points. */
export function fitCircle(points: readonly P2[]): CircleFit | null {
  const m = points.length;
  if (m < 3) return null;
  let mx = 0, my = 0;
  for (const [x, y] of points) { mx += x; my += y; }
  mx /= m; my /= m;
  let suu = 0, svv = 0, suv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0;
  for (const [x, y] of points) {
    const u = x - mx, v = y - my;
    suu += u * u; svv += v * v; suv += u * v;
    suuu += u * u * u; svvv += v * v * v; suvv += u * v * v; svuu += v * u * u;
  }
  const det = suu * svv - suv * suv;
  if (Math.abs(det) < 1e-12) return null;
  const rhs1 = 0.5 * (suuu + suvv);
  const rhs2 = 0.5 * (svvv + svuu);
  const uc = (rhs1 * svv - rhs2 * suv) / det;
  const vc = (suu * rhs2 - suv * rhs1) / det;
  const cx = uc + mx, cy = vc + my;
  const r = Math.sqrt(uc * uc + vc * vc + (suu + svv) / m);
  let maxResidual = 0;
  for (const p of points) maxResidual = Math.max(maxResidual, Math.abs(dist(p, [cx, cy]) - r));
  return { cx, cy, r, maxResidual };
}

/**
 * A closed polyline that is a full circle: ≥ 8 vertices, every vertex within
 * 2 % of the radius (min 0.02 mm) of the fitted circle, and the vertices
 * sweep the whole way round.
 */
export function asFullCircle(points: readonly P2[]): CircleFit | null {
  if (points.length < 9) return null;
  if (dist(points[0], points[points.length - 1]) > 1e-3 * Math.max(1, bboxDiag(points))) return null;
  const fit = fitCircle(points.slice(0, -1));
  if (!fit || fit.r <= 0) return null;
  if (fit.maxResidual > Math.max(0.02, 0.02 * fit.r)) return null;
  let sweep = 0;
  for (let i = 1; i < points.length; i++) {
    const a0 = Math.atan2(points[i - 1][1] - fit.cy, points[i - 1][0] - fit.cx);
    const a1 = Math.atan2(points[i][1] - fit.cy, points[i][0] - fit.cx);
    let d = a1 - a0;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    sweep += d;
  }
  return Math.abs(Math.abs(sweep) - 2 * Math.PI) < 0.2 ? fit : null;
}

function bboxDiag(points: readonly P2[]): number {
  const b = bboxOf(points);
  return b ? Math.hypot(b.x1 - b.x0, b.y1 - b.y0) : 0;
}

export function polylineSegments(points: readonly P2[]): Seg2[] {
  const out: Seg2[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    if (dist(points[i], points[i + 1]) > 0) out.push({ a: points[i], b: points[i + 1] });
  }
  return out;
}

/** Signed shoelace area; positive for counter-clockwise in a y-up frame. */
export function signedArea(loop: readonly P2[]): number {
  let s = 0;
  for (let i = 0; i < loop.length; i++) {
    const p = loop[i];
    const q = loop[(i + 1) % loop.length];
    s += p[0] * q[1] - q[0] * p[1];
  }
  return s / 2;
}

export function pointInPolygon(p: P2, poly: readonly P2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ---------------------------------------------------------------------------
// Planar graph + outer boundary
// ---------------------------------------------------------------------------

function segIntersection(s: Seg2, t: Seg2): { u: number; v: number } | null {
  const rx = s.b[0] - s.a[0], ry = s.b[1] - s.a[1];
  const qx = t.b[0] - t.a[0], qy = t.b[1] - t.a[1];
  const den = rx * qy - ry * qx;
  if (Math.abs(den) < 1e-12) return null;
  const wx = t.a[0] - s.a[0], wy = t.a[1] - s.a[1];
  const u = (wx * qy - wy * qx) / den;
  const v = (wx * ry - wy * rx) / den;
  return { u, v };
}

/**
 * Split every segment wherever another segment's endpoint touches its
 * interior (a T-junction) or two segments properly cross. The boundary walk
 * needs every junction to be a shared vertex.
 */
export function splitAtJunctions(segs: readonly Seg2[], tol: number): Seg2[] {
  const cuts: number[][] = segs.map(() => []);
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const len = dist(s.a, s.b);
    if (len <= tol) continue;
    const minX = Math.min(s.a[0], s.b[0]) - tol, maxX = Math.max(s.a[0], s.b[0]) + tol;
    const minY = Math.min(s.a[1], s.b[1]) - tol, maxY = Math.max(s.a[1], s.b[1]) + tol;
    for (let j = 0; j < segs.length; j++) {
      if (i === j) continue;
      const t = segs[j];
      if (Math.max(t.a[0], t.b[0]) < minX || Math.min(t.a[0], t.b[0]) > maxX) continue;
      if (Math.max(t.a[1], t.b[1]) < minY || Math.min(t.a[1], t.b[1]) > maxY) continue;
      for (const e of [t.a, t.b]) {
        const { d, t: param } = pointSegment(e, s.a, s.b);
        if (d <= tol && param * len > tol && (1 - param) * len > tol) cuts[i].push(param);
      }
      const x = segIntersection(s, t);
      if (x && x.u * len > tol && (1 - x.u) * len > tol) {
        const tLen = dist(t.a, t.b);
        if (x.v * tLen > tol && (1 - x.v) * tLen > tol) cuts[i].push(x.u);
      }
    }
  }
  const out: Seg2[] = [];
  segs.forEach((s, i) => {
    const params = [0, ...cuts[i].sort((p, q) => p - q), 1];
    for (let k = 0; k + 1 < params.length; k++) {
      if (params[k + 1] - params[k] < 1e-9) continue;
      const at = (t: number): P2 => [s.a[0] + t * (s.b[0] - s.a[0]), s.a[1] + t * (s.b[1] - s.a[1])];
      out.push({ a: at(params[k]), b: at(params[k + 1]) });
    }
  });
  return out;
}

/** Cluster endpoints within `tol` into shared vertices. */
function buildGraph(segs: readonly Seg2[], tol: number): { verts: P2[]; adj: Set<number>[] } {
  const verts: P2[] = [];
  const cells = new Map<string, number[]>();
  const key = (x: number, y: number) => `${Math.round(x / tol)},${Math.round(y / tol)}`;
  const vertexFor = (p: P2): number => {
    const gx = Math.round(p[0] / tol), gy = Math.round(p[1] / tol);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const idx of cells.get(`${gx + dx},${gy + dy}`) ?? []) {
          if (dist(verts[idx], p) <= tol) return idx;
        }
      }
    }
    verts.push(p);
    const k = key(p[0], p[1]);
    const bucket = cells.get(k);
    if (bucket) bucket.push(verts.length - 1);
    else cells.set(k, [verts.length - 1]);
    return verts.length - 1;
  };
  const adj: Set<number>[] = [];
  for (const s of segs) {
    const i = vertexFor(s.a);
    const j = vertexFor(s.b);
    while (adj.length < verts.length) adj.push(new Set());
    if (i === j) continue;
    adj[i].add(j);
    adj[j].add(i);
  }
  while (adj.length < verts.length) adj.push(new Set());
  return { verts, adj };
}

/**
 * Outer boundary of a connected planar linework graph, as a counter-clockwise
 * loop in a y-up frame. Starts at the lowest (then leftmost) vertex and at
 * every vertex takes the edge with the smallest counter-clockwise turn from
 * the reverse of the incoming edge — which hugs the exterior.
 *
 * Only the component containing the start vertex is walked; disconnected
 * inner linework (hole circles) is ignored by construction.
 */
export function outerBoundary(segs: readonly Seg2[], tol: number): P2[] {
  const split = splitAtJunctions(segs, tol);
  const { verts, adj } = buildGraph(split, tol);
  if (verts.length === 0) return [];
  let start = 0;
  for (let i = 1; i < verts.length; i++) {
    if (adj[i].size === 0) continue;
    const v = verts[i], s = verts[start];
    if (adj[start].size === 0 || v[1] < s[1] - tol || (Math.abs(v[1] - s[1]) <= tol && v[0] < s[0])) start = i;
  }
  const nextFrom = (cur: number, prev: number, refAngle: number): number => {
    let best = -1;
    let bestTurn = Infinity;
    for (const nb of adj[cur]) {
      const ang = Math.atan2(verts[nb][1] - verts[cur][1], verts[nb][0] - verts[cur][0]);
      let turn = ang - refAngle;
      while (turn <= 1e-9) turn += 2 * Math.PI;
      while (turn > 2 * Math.PI + 1e-9) turn -= 2 * Math.PI;
      // Only turn straight back at a dead end.
      if (nb === prev && adj[cur].size > 1) turn = 2 * Math.PI + 1;
      if (turn < bestTurn) { bestTurn = turn; best = nb; }
    }
    return best;
  };
  const loop: P2[] = [verts[start]];
  let prev = -1;
  let cur = start;
  let refAngle = -Math.PI / 2; // pretend we arrived from below
  let firstEdge: [number, number] | null = null;
  const maxSteps = split.length * 2 + 4;
  for (let step = 0; step < maxSteps; step++) {
    const next = nextFrom(cur, prev, refAngle);
    if (next < 0) break;
    if (firstEdge === null) firstEdge = [cur, next];
    else if (cur === firstEdge[0] && next === firstEdge[1]) break;
    refAngle = Math.atan2(verts[cur][1] - verts[next][1], verts[cur][0] - verts[next][0]);
    prev = cur;
    cur = next;
    loop.push(verts[cur]);
  }
  return removeCollinear(loop, tol);
}

/** Drop vertices that lie on the straight line between their neighbours. */
export function removeCollinear(loop: readonly P2[], tol: number): P2[] {
  let pts = [...loop];
  let changed = true;
  while (changed && pts.length > 3) {
    changed = false;
    for (let i = 0; i < pts.length && pts.length > 3; i++) {
      const p = pts[(i - 1 + pts.length) % pts.length];
      const q = pts[i];
      const r = pts[(i + 1) % pts.length];
      if (dist(p, q) <= tol || (pointSegment(q, p, r).d <= tol * 0.5 && pointSegment(q, p, r).t > 0 && pointSegment(q, p, r).t < 1)) {
        pts.splice(i, 1);
        changed = true;
        i--;
      }
    }
  }
  // A walk that returns to its start duplicates it at the end.
  if (pts.length > 1 && dist(pts[0], pts[pts.length - 1]) <= tol) pts = pts.slice(0, -1);
  return pts;
}

// ---------------------------------------------------------------------------
// Arc recovery
// ---------------------------------------------------------------------------

/** One boundary element: a straight segment, or a circular arc as a DXF bulge. */
export interface LoopElement {
  a: P2;
  b: P2;
  /** tan(includedAngle / 4), positive counter-clockwise (y-up). 0 for a line. */
  bulge: number;
  /** Arc centre and radius when `bulge !== 0`. */
  arc?: { cx: number; cy: number; r: number };
}

/**
 * Re-express runs of short chords as circular arcs. A run qualifies when it
 * has ≥ 3 chords, turns consistently one way by < 35° per vertex, and every
 * vertex sits within `tol` of one fitted circle. Everything else stays a line.
 */
function turnAt(loop: readonly P2[], nPts: number, i: number): number {
  const p = loop[(i - 1 + nPts) % nPts], q = loop[i], r = loop[(i + 1) % nPts];
  const a1 = Math.atan2(q[1] - p[1], q[0] - p[0]);
  const a2 = Math.atan2(r[1] - q[1], r[0] - q[0]);
  let d = a2 - a1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

function rotateToSharpCorner(loop: readonly P2[], nPts: number): { pts: P2[]; turns: number[] } {
  // Rotate so the loop starts at a sharp corner, when there is one, so no arc wraps the seam.
  let startIdx = 0;
  for (let i = 0; i < nPts; i++) {
    if (Math.abs(turnAt(loop, nPts, i)) > (35 * Math.PI) / 180) { startIdx = i; break; }
  }
  const pts = [...loop.slice(startIdx), ...loop.slice(0, startIdx)];
  const turns = pts.map((_, i) => turnAt(loop, nPts, (i + startIdx) % nPts));
  return { pts, turns };
}

function growArcRun(
  pts: readonly P2[],
  turns: readonly number[],
  i: number,
  nPts: number,
  tol: number,
): { best: number; bestFit: CircleFit | null } {
  let j = i + 1;
  let best = -1;
  let bestFit: CircleFit | null = null;
  // Grow the run while the interior vertices turn the same way gently.
  while (j < nPts && j - i <= 256) {
    const t = turns[j % nPts];
    const sameSign = Math.sign(t) === Math.sign(turns[(i + 1) % nPts]) && Math.abs(t) > 1e-6;
    if (!sameSign || Math.abs(t) > (35 * Math.PI) / 180) break;
    const candidate = pts.slice(i, j + 2 > nPts ? nPts : j + 2);
    if (j + 1 >= nPts) candidate.push(pts[0]);
    if (candidate.length >= 4) {
      const fit = fitCircle(candidate);
      if (fit && fit.maxResidual <= tol && fit.r > tol * 4) { best = j + 1; bestFit = fit; }
      else if (best >= 0) break;
    }
    j++;
  }
  return { best, bestFit };
}

export function recoverArcs(loop: readonly P2[], tol: number): LoopElement[] {
  const nPts = loop.length;
  if (nPts < 3) return [];
  const { pts, turns } = rotateToSharpCorner(loop, nPts);
  const out: LoopElement[] = [];
  let i = 0;
  while (i < nPts) {
    const { best, bestFit } = growArcRun(pts, turns, i, nPts, tol);
    if (best >= 0 && bestFit) {
      const a = pts[i];
      const b = pts[best % nPts];
      const mid = pts[Math.floor((i + best) / 2) % nPts];
      out.push({ a, b, bulge: bulgeFrom(a, b, mid, bestFit), arc: { cx: bestFit.cx, cy: bestFit.cy, r: bestFit.r } });
      i = best;
    } else {
      out.push({ a: pts[i], b: pts[(i + 1) % nPts], bulge: 0 });
      i++;
    }
  }
  return out;
}

/** Bulge of the arc a→b through `mid` on circle `c` (signed, CCW positive, y-up). */
export function bulgeFrom(a: P2, b: P2, mid: P2, c: { cx: number; cy: number }): number {
  const angA = Math.atan2(a[1] - c.cy, a[0] - c.cx);
  const angB = Math.atan2(b[1] - c.cy, b[0] - c.cx);
  const angM = Math.atan2(mid[1] - c.cy, mid[0] - c.cx);
  const norm = (x: number) => { let v = x % (2 * Math.PI); if (v < 0) v += 2 * Math.PI; return v; };
  const ccwAB = norm(angB - angA);
  const ccwAM = norm(angM - angA);
  const sweep = ccwAM <= ccwAB ? ccwAB : ccwAB - 2 * Math.PI;
  return Math.tan(sweep / 4);
}

// ---------------------------------------------------------------------------
// Silhouette rasterisation
// ---------------------------------------------------------------------------

/**
 * Intersection-over-union of two filled polygons sampled on a common grid
 * (cell ≈ max extent / `resolution`). Loops may carry inner loops as
 * `holes` — cells inside a hole are empty.
 */
export function silhouetteIoU(
  a: { outer: readonly P2[]; holes?: readonly (readonly P2[])[] },
  b: { outer: readonly P2[]; holes?: readonly (readonly P2[])[] },
  resolution = 240,
): number {
  const box = bboxOf([...a.outer, ...b.outer]);
  if (!box) return 0;
  const w = box.x1 - box.x0, h = box.y1 - box.y0;
  const cell = Math.max(w, h) / resolution;
  if (cell <= 0) return 0;
  const inside = (shape: typeof a, p: P2) =>
    pointInPolygon(p, shape.outer) && !(shape.holes ?? []).some(hole => pointInPolygon(p, hole));
  let both = 0, either = 0;
  for (let y = box.y0 + cell / 2; y < box.y1; y += cell) {
    for (let x = box.x0 + cell / 2; x < box.x1; x += cell) {
      const ia = inside(a, [x, y]);
      const ib = inside(b, [x, y]);
      if (ia && ib) both++;
      if (ia || ib) either++;
    }
  }
  return either === 0 ? 0 : both / either;
}
