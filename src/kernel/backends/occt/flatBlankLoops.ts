// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/flatBlankLoops.ts
//
// Inner loops (holes, cutouts) of a flat sheet-metal blank, as 2D polylines
// in blank (sketch XY) coordinates. `flattenPattern` recovers the OUTER
// outline from the sheetMetal sketch; anything drilled or cut through the
// blank before it was bent only exists in the lowered solid, so it is read
// back here from the blank's top face.

import { measureArea, type Edge, type Face, type Wire } from 'replicad';
import type { Vec2 } from '../../../shared/intent/region';
import type { OcctBackend } from './occtBackend';

/** Polyline points per full turn of a curved edge. */
const SAMPLES_PER_TURN = 48;
/** Endpoint-matching tolerance (mm) when chaining a wire's edges. */
const JOIN_TOL = 1e-4;

function isTopFace(face: Face, zTop: number): boolean {
  if (face.geomType !== 'PLANE') return false;
  if (Math.abs(face.center.z - zTop) > 1e-3) return false;
  try {
    const n = face.normalAt();
    return n.z > 0.999;
  } catch {
    return false;
  }
}

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

/**
 * The inner loops of a flat blank's top face (the largest +Z planar face at
 * the blank's top), each a CW polyline in XY. Empty when the blank has no
 * holes or no such face.
 */
export function flatBlankInnerLoops(blank: OcctBackend): Vec2[][] {
  const shape = blank.getReplicadShape();
  const zTop = blank.boundingBox().max[2];
  const tops = shape.faces.filter((f) => isTopFace(f, zTop));
  if (tops.length === 0) return [];
  const top = tops.reduce((a, b) => (measureArea(b) > measureArea(a) ? b : a));
  const loops: Vec2[][] = [];
  for (const wire of top.innerWires()) {
    const poly = wireToPolyline(wire);
    if (poly.length < 3) continue;
    loops.push(signedArea(poly) > 0 ? poly.reverse() : poly);
  }
  return loops;
}
