// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/flatBlankLoops.ts
//
// Inner loops (holes, cutouts) of a flat sheet-metal blank, as 2D polylines
// in blank (sketch XY) coordinates. `flattenPattern` recovers the OUTER
// outline from the sheetMetal sketch; anything drilled or cut through the
// blank before it was bent only exists in the lowered solid, so it is read
// back here from the blank's top face.

import type { Edge, Face, Wire } from 'replicad';
import type { FlatPatternBead, Vec2 } from '../../../shared/intent/region';
import type { OcctBackend } from './occtBackend';

/** Polyline points per full turn of a curved edge. */
const SAMPLES_PER_TURN = 48;
/** Endpoint-matching tolerance (mm) when chaining a wire's edges. */
const JOIN_TOL = 1e-4;

/** Sample one edge start → end (in its own parameter direction). */
function sampleEdge(edge: Edge): Vec2[] {
  if (edge.geomType === 'LINE') {
    return [[edge.startPoint.x, edge.startPoint.y], [edge.endPoint.x, edge.endPoint.y]];
  }
  let n = SAMPLES_PER_TURN;
  try {
    // Scale by arc length against a full circle of the same chord span;
    // never fewer than 8 segments.
    const r = Math.max(1e-6, Math.hypot(edge.endPoint.x - edge.startPoint.x, edge.endPoint.y - edge.startPoint.y) / 2);
    n = Math.max(8, Math.min(SAMPLES_PER_TURN, Math.ceil((edge.length / (2 * Math.PI * r)) * SAMPLES_PER_TURN)));
  } catch { /* keep the default */ }
  const pts: Vec2[] = [];
  for (let i = 0; i <= n; i++) {
    const p = edge.pointAt(i / n);
    pts.push([p.x, p.y]);
  }
  return pts;
}

const near = (a: Vec2, b: Vec2): boolean => Math.hypot(a[0] - b[0], a[1] - b[1]) <= JOIN_TOL;

/** Chain a wire's edges end-to-start into one closed polyline (no repeated
 *  closing point). */
function wireToPolyline(wire: Wire): Vec2[] {
  const pending = wire.edges.map(sampleEdge);
  if (pending.length === 0) return [];
  const out: Vec2[] = [...pending.shift()!];
  while (pending.length > 0) {
    const end = out[out.length - 1];
    let idx = pending.findIndex((p) => near(p[0], end));
    let next: Vec2[] | undefined;
    if (idx >= 0) next = pending[idx];
    else {
      idx = pending.findIndex((p) => near(p[p.length - 1], end));
      if (idx < 0) break; // disconnected wire: keep what chained
      next = [...pending[idx]].reverse();
    }
    pending.splice(idx, 1);
    out.push(...next.slice(1));
  }
  if (out.length > 1 && near(out[0], out[out.length - 1])) out.pop();
  return out;
}

/** Signed area (positive = CCW). */
function signedArea(poly: readonly Vec2[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
}

/** Distance from point `p` to line segment `[a, b]` in 2D. */
function pointToSegmentDist(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 1e-12) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function isBeadFootprintLoop(poly: readonly Vec2[], beads: readonly FlatPatternBead[]): boolean {
  const tol = 0.05;
  return beads.some((b) => {
    const r = b.width / 2 + tol;
    return poly.every((p) => pointToSegmentDist(p, b.start, b.end) <= r);
  });
}

/** A face with an internal opening that is not the sheet's flat top plane. */
export interface OffPlaneInnerLoopFace {
  center: [number, number, number];
  /** Null when the face is not planar. */
  normal: [number, number, number] | null;
  planar: boolean;
}

export interface FlatPlaneInnerLoopScan {
  /** Closed inner loops on the flat top plane, each a CW polyline in XY. */
  loops: Vec2[][];
  /** Faces whose openings cannot be projected into the flat plane by XY. */
  offPlaneFaces: OffPlaneInnerLoopFace[];
}

/**
 * Inner loops that lie on the sheet's flat top plane, plus every face that
 * carries an opening outside that plane. A folded flange's holes, and any cut
 * that crosses a bend, land in `offPlaneFaces`: their XY projection is not the
 * flat pattern, so callers must not silently drop them.
 *
 * A face is on the flat plane when it is planar, its normal is parallel to Z,
 * its centre lies within the sheet thickness slab, and it faces +Z (the top
 * surface). Bottom (−Z) openings mirror the top ones and are skipped.
 */
export function scanFlatPlaneInnerLoops(
  shape: OcctBackend,
  zTop: number,
  zBottom: number,
  opts?: { excludeBeads?: readonly FlatPatternBead[] },
): FlatPlaneInnerLoopScan {
  const loops: Vec2[][] = [];
  const offPlaneFaces: OffPlaneInnerLoopFace[] = [];
  const excludeBeads = opts?.excludeBeads ?? [];
  for (const face of shape.getReplicadShape().faces) {
    const info = readFacePlane(face);
    // innerWires() deletes the Face wrapper, so every property above is read
    // first.
    const inner = face.innerWires();
    if (inner.length === 0) continue;
    const kind = classifyFlatFace(info, zTop, zBottom);
    if (kind === 'off') {
      offPlaneFaces.push(info);
      continue;
    }
    if (kind === 'bottom') continue;
    loops.push(...innerLoopsOf(inner, excludeBeads));
  }
  return { loops, offPlaneFaces };
}

function readFacePlane(face: Face): OffPlaneInnerLoopFace {
  const center = face.center;
  const info: OffPlaneInnerLoopFace = {
    center: [center.x, center.y, center.z],
    normal: null,
    planar: face.geomType === 'PLANE',
  };
  if (!info.planar) return info;
  try {
    const n = face.normalAt();
    info.normal = [n.x, n.y, n.z];
  } catch {
    info.planar = false;
  }
  return info;
}

/** 'top' / 'bottom': parallel to the sheet and inside its thickness slab. */
function classifyFlatFace(
  info: OffPlaneInnerLoopFace,
  zTop: number,
  zBottom: number,
): 'top' | 'bottom' | 'off' {
  if (!info.planar || info.normal === null || Math.abs(info.normal[2]) <= 0.999) return 'off';
  const z = info.center[2];
  if (z < zBottom - JOIN_TOL || z > zTop + JOIN_TOL) return 'off';
  return info.normal[2] > 0 ? 'top' : 'bottom';
}

function innerLoopsOf(wires: readonly Wire[], excludeBeads: readonly FlatPatternBead[]): Vec2[][] {
  const loops: Vec2[][] = [];
  for (const wire of wires) {
    const poly = wireToPolyline(wire);
    if (poly.length < 3) continue;
    if (excludeBeads.length > 0 && isBeadFootprintLoop(poly, excludeBeads)) continue;
    loops.push(signedArea(poly) > 0 ? poly.reverse() : poly);
  }
  return loops;
}

/**
 * The inner loops on a flat blank's +Z top plane, each a CW polyline in XY.
 * Empty when the blank has no holes or no such face.
 */
export function flatBlankInnerLoops(
  blank: OcctBackend,
  opts?: { zTop?: number; excludeBeads?: readonly FlatPatternBead[] },
): Vec2[][] {
  const bb = blank.boundingBox();
  return scanFlatPlaneInnerLoops(blank, opts?.zTop ?? bb.max[2], bb.min[2], {
    excludeBeads: opts?.excludeBeads,
  }).loops;
}
