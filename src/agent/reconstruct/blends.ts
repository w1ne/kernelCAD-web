// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/reconstruct/blends.ts
//
// Constant-radius edge blends (fillets), measured against the SHARP
// reconstruction's own edges.
//
// In the cross-section perpendicular to an edge, a constant-radius blend is a
// circular arc tangent to the two faces that meet there. For a mesh point p
// near edge point e0 with outward face normals nA, nB, let q = σ (p − e0)
// projected off the edge tangent (σ = −1 on a convex edge, where the blend
// removes material, +1 on a concave one, where it adds). The arc centre sits
// at e0 + σ r w with nA·w = nB·w = 1, so |q − r w| = r:
//
//     (|w|² − 1) r² − 2 (w·q) r + |q|² = 0,   r = larger root
//
// (for a 90° edge: r = hA + hB + √(2 hA hB), hA/hB the point's depths below
// each face). Points lying on either face (depth ≈ 0) carry no information
// and are skipped; points near the edge ends belong to corner patches (the
// sphere or torus where blends meet) and are skipped too — the kernel
// rebuilds those when the meeting edges are filleted together, and the
// fidelity measurement checks the result. An edge is a blend when enough
// estimates agree (robust spread within a few percent); a chamfer or a
// variable-radius blend scatters and is rejected.

import { type V3 } from './geom';
import { snapValue } from './profileFit';

export interface SharpEdgeSample {
  p: V3;
  /** Outward normals of the two faces meeting at `p`. */
  nA: V3;
  nB: V3;
}

/** One B-rep edge of an evaluated reconstruction. */
export interface SharpEdge {
  curveType: string;
  start: V3;
  end: V3;
  /** The kernel's own convexity reading (null where it could not decide). */
  kernelConvex: boolean | null;
  /** The kernel's interior dihedral angle in degrees (180 = tangent), or null. */
  kernelDihedralDeg: number | null;
  /** Samples along the edge with both adjacent face normals; empty for seams. */
  samples: SharpEdgeSample[];
  /** Material lies on the inward side of both faces (sign measured on the sharp mesh). */
  convex?: boolean;
}

export interface EdgeBlend {
  edge: number;
  measuredRadius: number;
  spread: number;
  count: number;
}

export interface RejectedBlend {
  edge: number;
  count: number;
  medianRadius: number;
  spread: number;
  reason: string;
}

export interface BlendDetection {
  blends: EdgeBlend[];
  rejected: RejectedBlend[];
}

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Weighted median of `values` (weights = surface area each sample stands for). */
function weightedMedian(values: number[], weights: number[]): number {
  const idx = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (const i of idx) {
    acc += weights[i];
    if (acc >= total / 2) return values[i];
  }
  return values[idx[idx.length - 1]];
}

const hash = (ix: number, iy: number, iz: number) => ((ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791)) | 0;

function buildSegmentGrid(edges: SharpEdge[], cell: number): {
  segGrid: Map<number, number[]>;
  segEdge: number[];
  segIndex: number[];
} {
  const segGrid = new Map<number, number[]>();
  const segEdge: number[] = [];
  const segIndex: number[] = [];
  edges.forEach((edge, ei) => {
    const smp = edge.samples;
    for (let k = 0; k + 1 < smp.length; k++) {
      const id = segEdge.length;
      segEdge.push(ei);
      segIndex.push(k);
      const a = smp[k].p, b = smp[k + 1].p;
      const lo = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])].map((v) => Math.floor(v / cell));
      const hi = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])].map((v) => Math.floor(v / cell));
      for (let ix = lo[0]; ix <= hi[0]; ix++) {
        for (let iy = lo[1]; iy <= hi[1]; iy++) {
          for (let iz = lo[2]; iz <= hi[2]; iz++) {
            const key = hash(ix, iy, iz);
            const list = segGrid.get(key);
            if (list) list.push(id);
            else segGrid.set(key, [id]);
          }
        }
      }
    }
  });
  return { segGrid, segEdge, segIndex };
}

function nearestEdgeSegments(
  points: Float64Array,
  pointCount: number,
  edges: SharpEdge[],
  cell: number,
  segGrid: Map<number, number[]>,
  segEdge: number[],
  segIndex: number[],
): { bestDist: Float64Array; bestEdge: Int32Array; bestSeg: Int32Array; bestU: Float64Array } {
  const bestDist = new Float64Array(pointCount).fill(Infinity);
  const bestEdge = new Int32Array(pointCount).fill(-1);
  const bestSeg = new Int32Array(pointCount);
  const bestU = new Float64Array(pointCount);
  const seen = new Int32Array(segEdge.length).fill(-1);
  for (let pi = 0; pi < pointCount; pi++) {
    const px = points[pi * 3], py = points[pi * 3 + 1], pz = points[pi * 3 + 2];
    const cx = Math.floor(px / cell), cy = Math.floor(py / cell), cz = Math.floor(pz / cell);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const list = segGrid.get(hash(cx + dx, cy + dy, cz + dz));
          if (!list) continue;
          for (const id of list) {
            if (seen[id] === pi) continue;
            seen[id] = pi;
            const ei = segEdge[id];
            const k = segIndex[id];
            const a = edges[ei].samples[k].p, b = edges[ei].samples[k + 1].p;
            const ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2];
            const len2 = ex * ex + ey * ey + ez * ez;
            let u = len2 > 0 ? ((px - a[0]) * ex + (py - a[1]) * ey + (pz - a[2]) * ez) / len2 : 0;
            u = Math.max(0, Math.min(1, u));
            const qx = a[0] + u * ex - px, qy = a[1] + u * ey - py, qz = a[2] + u * ez - pz;
            const d = Math.hypot(qx, qy, qz);
            if (d < bestDist[pi]) {
              bestDist[pi] = d;
              bestEdge[pi] = ei;
              bestSeg[pi] = k;
              bestU[pi] = u;
            }
          }
        }
      }
    }
  }
  return { bestDist, bestEdge, bestSeg, bestU };
}

function edgeArcLengths(edges: SharpEdge[]): { lengths: number[]; cumulative: number[][] } {
  const lengths = edges.map((e) => {
    let L = 0;
    for (let k = 0; k + 1 < e.samples.length; k++) {
      const a = e.samples[k].p, b = e.samples[k + 1].p;
      L += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    }
    return L;
  });
  const cumulative = edges.map((e) => {
    const c = [0];
    for (let k = 0; k + 1 < e.samples.length; k++) {
      const a = e.samples[k].p, b = e.samples[k + 1].p;
      c.push(c[k] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
    }
    return c;
  });
  return { lengths, cumulative };
}

function collectRadiusEstimates(
  points: Float64Array,
  weights: Float64Array,
  edges: SharpEdge[],
  pointCount: number,
  bestDist: Float64Array,
  bestEdge: Int32Array,
  bestSeg: Int32Array,
  bestU: Float64Array,
  depthTol: number,
  maxRadius: number,
  cumulative: number[][],
): Map<number, Array<{ r: number; arc: number; w: number }>> {
  // Per-edge radius estimates.
  const perEdge = new Map<number, Array<{ r: number; arc: number; w: number }>>();
  for (let pi = 0; pi < pointCount; pi++) {
    const ei = bestEdge[pi];
    if (ei < 0 || bestDist[pi] > maxRadius) continue;
    const edge = edges[ei];
    if (edge.convex === undefined) continue;
    const k = bestSeg[pi];
    const u = bestU[pi];
    const sa = edge.samples[k], sb = edge.samples[k + 1];
    const e0: V3 = [sa.p[0] + u * (sb.p[0] - sa.p[0]), sa.p[1] + u * (sb.p[1] - sa.p[1]), sa.p[2] + u * (sb.p[2] - sa.p[2])];
    const tRaw: V3 = [sb.p[0] - sa.p[0], sb.p[1] - sa.p[1], sb.p[2] - sa.p[2]];
    const tl = Math.hypot(tRaw[0], tRaw[1], tRaw[2]);
    if (tl === 0) continue;
    const t: V3 = [tRaw[0] / tl, tRaw[1] / tl, tRaw[2] / tl];
    const lerp = (a: V3, b: V3): V3 => {
      const v: V3 = [a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1]), a[2] + u * (b[2] - a[2])];
      const n = Math.hypot(v[0], v[1], v[2]) || 1;
      return [v[0] / n, v[1] / n, v[2] / n];
    };
    const nA = lerp(sa.nA, sb.nA);
    const nB = lerp(sa.nB, sb.nB);
    const sigma = edge.convex ? -1 : 1;
    const raw: V3 = [
      sigma * (points[pi * 3] - e0[0]),
      sigma * (points[pi * 3 + 1] - e0[1]),
      sigma * (points[pi * 3 + 2] - e0[2]),
    ];
    const along = dot(raw, t);
    const q: V3 = [raw[0] - along * t[0], raw[1] - along * t[1], raw[2] - along * t[2]];
    const hA = dot(nA, q);
    const hB = dot(nB, q);
    if (hA <= depthTol || hB <= depthTol) continue;
    const c = dot(nA, nB);
    if (c > Math.cos((5 * Math.PI) / 180) || c < -0.999) continue;
    const a = (1 - c) / (1 + c);
    const wq = (hA + hB) / (1 + c);
    const qq = dot(q, q);
    const disc = wq * wq - a * qq;
    if (disc < 0) continue;
    const r = (wq + Math.sqrt(disc)) / a;
    if (!(r > 0) || r > maxRadius) continue;
    const arc = cumulative[ei][k] + u * (cumulative[ei][k + 1] - cumulative[ei][k]);
    const list = perEdge.get(ei);
    const w = weights[pi];
    if (list) list.push({ r, arc, w });
    else perEdge.set(ei, [{ r, arc, w }]);
  }
  return perEdge;
}

function classifyBlendEstimates(
  edges: SharpEdge[],
  perEdge: Map<number, Array<{ r: number; arc: number; w: number }>>,
  lengths: number[],
  depthTol: number,
): BlendDetection {
  const blends: EdgeBlend[] = [];
  const rejected: RejectedBlend[] = [];
  for (const [ei, estimates] of perEdge) {
    const edge = edges[ei];
    const L = lengths[ei];
    const closed = Math.hypot(edge.start[0] - edge.end[0], edge.start[1] - edge.end[1], edge.start[2] - edge.end[2]) < 1e-6;
    // Two rounds: drop corner-patch points within ~1.2 r of an open edge's ends.
    let usable = closed ? estimates : estimates.filter((e) => e.arc > 0.1 * L && e.arc < 0.9 * L);
    if (usable.length < 6) continue;
    const wmed = (list: typeof usable) => weightedMedian(list.map((e) => e.r), list.map((e) => e.w));
    let rMed = wmed(usable);
    if (!closed) {
      const refined = estimates.filter((e) => e.arc > 1.2 * rMed && e.arc < L - 1.2 * rMed);
      if (refined.length >= 6) {
        usable = refined;
        rMed = wmed(usable);
      }
    }
    const spread = 1.4826 * weightedMedian(usable.map((e) => Math.abs(e.r - rMed)), usable.map((e) => e.w));
    // Coverage along the usable span (away from corner patches); a short edge
    // has no room for a partial blend to be told apart, so it is not checked.
    const lo = closed ? 0 : Math.min(1.2 * rMed, L / 2);
    const hi = closed ? L : Math.max(L - 1.2 * rMed, L / 2);
    const span = hi - lo;
    const binCount = span >= 4 * rMed ? 5 : 3;
    const bins = new Set(usable.map((e) => Math.min(binCount - 1, Math.max(0, Math.floor((binCount * (e.arc - lo)) / Math.max(span, 1e-9))))));
    const coverageChecked = closed || span >= 1.5 * rMed;
    if (rMed < 2 * depthTol) {
      rejected.push({ edge: ei, count: usable.length, medianRadius: rMed, spread, reason: 'blend too small to measure' });
      continue;
    }
    if (spread > Math.max(0.03 * rMed, 1.5 * depthTol)) {
      rejected.push({ edge: ei, count: usable.length, medianRadius: rMed, spread, reason: 'radius varies along the edge (variable-radius or non-circular blend)' });
      continue;
    }
    if (coverageChecked && bins.size < 2) {
      rejected.push({ edge: ei, count: usable.length, medianRadius: rMed, spread, reason: 'blend covers only part of the edge' });
      continue;
    }
    blends.push({ edge: ei, measuredRadius: rMed, spread, count: usable.length });
  }
  return { blends, rejected };
}

/**
 * Measure constant-radius blends on sharp edges.
 *
 * `points` are surface sample points of the input mesh (flat xyz) in the same
 * frame as `edges`. `depthTol` is the depth below both faces a point needs to
 * count as off the sharp surface; `maxRadius` bounds the search.
 */
export function detectEdgeBlends(
  points: Float64Array,
  weights: Float64Array,
  edges: SharpEdge[],
  depthTol: number,
  maxRadius: number,
): BlendDetection {
  const pointCount = points.length / 3;

  // Uniform grid over the edge polyline segments; each point looks up the
  // segments in its own and neighbouring cells (cell = maxRadius), so the cost
  // is points × nearby segments instead of points × all edge samples.
  const cell = Math.max(maxRadius, 1e-3);
  const { segGrid, segEdge, segIndex } = buildSegmentGrid(edges, cell);
  const { bestDist, bestEdge, bestSeg, bestU } = nearestEdgeSegments(points, pointCount, edges, cell, segGrid, segEdge, segIndex);
  const { lengths, cumulative } = edgeArcLengths(edges);
  const perEdge = collectRadiusEstimates(points, weights, edges, pointCount, bestDist, bestEdge, bestSeg, bestU, depthTol, maxRadius, cumulative);
  const { blends, rejected } = classifyBlendEstimates(edges, perEdge, lengths, depthTol);
  blends.sort((a, b) => a.edge - b.edge);
  rejected.sort((a, b) => a.edge - b.edge);
  return { blends, rejected };
}

/** Radius groups: blends whose snapped radii coincide share one fillet param. */
export function groupBlends(
  blends: EdgeBlend[],
  snapTol: number,
): Array<{ radius: number; measured: number; snapped: boolean; grid: number; edges: number[] }> {
  const groups: Array<{ radius: number; measured: number[]; edges: number[] }> = [];
  // Radii are measured less tightly than planes (a few percent of r), so a
  // snapping pass allows that much; a no-snap pass snaps nothing.
  const tolFor = (r: number) => (snapTol > 0 ? Math.max(snapTol, 0.02 * r) : 0);
  for (const b of blends) {
    const s = snapValue(b.measuredRadius, tolFor(b.measuredRadius));
    const g = groups.find((x) => Math.abs(x.radius - s.value) < 1e-9);
    if (g) {
      g.measured.push(b.measuredRadius);
      g.edges.push(b.edge);
    } else groups.push({ radius: s.value, measured: [b.measuredRadius], edges: [b.edge] });
  }
  return groups.map((g) => {
    const measured = g.measured.reduce((a, b) => a + b, 0) / g.measured.length;
    const s = snapValue(measured, tolFor(measured));
    return { radius: s.value, measured, snapped: s.snapped, grid: s.grid, edges: g.edges };
  });
}

// ---------------------------------------------------------------------------
// Edge selection: the smallest EdgeQuery the kernel resolves to exactly a group
// ---------------------------------------------------------------------------

export interface EdgeQueryOut {
  atZ?: number;
  atX?: number;
  atY?: number;
  within?: { xMin: number; xMax: number; yMin: number; yMax: number; zMin: number; zMax: number };
  parallel?: V3;
  perpendicular?: V3;
  ofCurveType?: string;
  convex?: boolean;
  concave?: boolean;
  tolerance?: number;
}

function chordMid(e: SharpEdge): V3 {
  return [(e.start[0] + e.end[0]) / 2, (e.start[1] + e.end[1]) / 2, (e.start[2] + e.end[2]) / 2];
}

function chordDir(e: SharpEdge): V3 {
  const d: V3 = [e.end[0] - e.start[0], e.end[1] - e.start[1], e.end[2] - e.start[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  return l > 0 ? [d[0] / l, d[1] / l, d[2] / l] : [0, 0, 0];
}

/** Mirror of the kernel's EdgeQuery resolution (chord midpoint / chord direction). */
export function edgeMatchesQuery(e: SharpEdge, q: EdgeQueryOut): boolean {
  const tol = q.tolerance ?? 1.0;
  const m = chordMid(e);
  if (q.atZ !== undefined && Math.abs(m[2] - q.atZ) > tol) return false;
  if (q.atX !== undefined && Math.abs(m[0] - q.atX) > tol) return false;
  if (q.atY !== undefined && Math.abs(m[1] - q.atY) > tol) return false;
  if (q.within) {
    const w = q.within;
    if (m[0] < w.xMin || m[0] > w.xMax || m[1] < w.yMin || m[1] > w.yMax || m[2] < w.zMin || m[2] > w.zMax) return false;
  }
  const d = chordDir(e);
  const zero = d[0] === 0 && d[1] === 0 && d[2] === 0;
  if (q.parallel) {
    if (zero || Math.abs(dot(d, q.parallel)) < Math.cos((10 * Math.PI) / 180)) return false;
  }
  if (q.perpendicular) {
    if (zero || Math.abs(dot(d, q.perpendicular)) > Math.sin((10 * Math.PI) / 180)) return false;
  }
  if (q.ofCurveType && e.curveType !== q.ofCurveType) return false;
  if (q.convex !== undefined || q.concave !== undefined) {
    if (e.kernelConvex === null) return false;
    if (q.convex === true && e.kernelConvex !== true) return false;
    if (q.concave === true && e.kernelConvex !== false) return false;
  }
  return true;
}

const round4 = (v: number) => Math.round(v * 1e4) / 1e4;

/**
 * Selectors for a group of edge indices: a single query when one reproduces the
 * group exactly (`[undefined]` means "every edge"), else one tight `within`
 * box per edge. Seam edges (no samples) are "don't care" for the every-edge
 * form only. Returns null when some edge cannot be singled out.
 */
export function selectorsForGroup(edges: SharpEdge[], group: number[]): Array<EdgeQueryOut | undefined> | null {
  const want = new Set(group);
  const exact = (q: EdgeQueryOut) => edges.every((e, i) => edgeMatchesQuery(e, q) === want.has(i));
  const seams = new Set(edges.map((e, i) => (e.samples.length === 0 ? i : -1)).filter((i) => i >= 0));
  if (edges.every((_, i) => want.has(i) || seams.has(i))) return [undefined];

  const mids = group.map((i) => chordMid(edges[i]));
  const candidates: EdgeQueryOut[] = [];
  const basics: EdgeQueryOut[] = [
    { convex: true },
    { concave: true },
    { ofCurveType: 'LINE' },
    { ofCurveType: 'CIRCLE' },
    { parallel: [0, 0, 1] },
    { parallel: [1, 0, 0] },
    { parallel: [0, 1, 0] },
    { perpendicular: [0, 0, 1] },
  ];
  const levels: EdgeQueryOut[] = [];
  (['atZ', 'atX', 'atY'] as const).forEach((key, axisIdx) => {
    const idx = key === 'atZ' ? 2 : key === 'atX' ? 0 : 1;
    void axisIdx;
    const v = mids[0][idx];
    if (mids.every((m) => Math.abs(m[idx] - v) <= 1e-3)) levels.push({ [key]: round4(v), tolerance: 0.01 });
  });
  candidates.push(...basics, ...levels);
  for (const l of levels) for (const b of basics) candidates.push({ ...l, ...b });
  for (let i = 0; i < levels.length; i++) {
    for (let j = i + 1; j < levels.length; j++) candidates.push({ ...levels[i], ...levels[j] });
  }
  for (let i = 0; i < basics.length; i++) for (let j = i + 1; j < basics.length; j++) candidates.push({ ...basics[i], ...basics[j] });
  const margin = 0.01;
  const within = {
    xMin: round4(Math.min(...mids.map((m) => m[0])) - margin),
    xMax: round4(Math.max(...mids.map((m) => m[0])) + margin),
    yMin: round4(Math.min(...mids.map((m) => m[1])) - margin),
    yMax: round4(Math.max(...mids.map((m) => m[1])) + margin),
    zMin: round4(Math.min(...mids.map((m) => m[2])) - margin),
    zMax: round4(Math.max(...mids.map((m) => m[2])) + margin),
  };
  candidates.push({ within });
  for (const b of basics) candidates.push({ within, ...b });
  for (const q of candidates) if (exact(q)) return [q];

  const out: EdgeQueryOut[] = [];
  for (const i of group) {
    const m = chordMid(edges[i]);
    const box = {
      within: {
        xMin: round4(m[0] - margin), xMax: round4(m[0] + margin),
        yMin: round4(m[1] - margin), yMax: round4(m[1] + margin),
        zMin: round4(m[2] - margin), zMax: round4(m[2] + margin),
      },
    };
    const single = (q: EdgeQueryOut) => edges.every((e, k) => edgeMatchesQuery(e, q) === (k === i));
    const refined = [box, { ...box, ofCurveType: edges[i].curveType }].find(single);
    if (!refined) return null;
    out.push(refined);
  }
  return out;
}
