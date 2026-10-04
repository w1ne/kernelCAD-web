// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';
import { fitCircle, vdist, type CircleFit, type Vec3 } from './measureMath';

/** One BREP edge in world coordinates, ready for snapping. */
export interface EdgePolyline {
  /** Flat xyz of the ordered polyline points. */
  pts: Float32Array;
  closed: boolean;
  /** Point indices that are corners: open-edge ends and sharp turns. */
  corners: number[];
  /** Set when the edge is closed and fits a circle within 1% RMS. */
  circle: CircleFit | null;
}

/** Turn sharper than ~20 degrees makes a polyline vertex a corner. */
const CORNER_COS = 0.94;

const readV = (a: ArrayLike<number>, i: number): Vec3 => [a[i * 3], a[i * 3 + 1], a[i * 3 + 2]];
const same = (a: Vec3, b: Vec3): boolean => vdist(a, b) < 1e-5;

/** Ordered points of one `[start, count]` range. The viewer draws edges as
 *  line segments, so a range is normally vertex PAIRS (a,b,b,c,c,d...);
 *  a range that is already a plain polyline is read as is. */
export function rangePoints(edges: ArrayLike<number>, start: number, count: number): Vec3[] {
  if (count < 2) return [];
  const pairs = count >= 4 && same(readV(edges, start + 1), readV(edges, start + 2));
  if (!pairs) return Array.from({ length: count }, (_, k) => readV(edges, start + k));
  const out: Vec3[] = [readV(edges, start)];
  for (let k = 1; k < count; k += 2) out.push(readV(edges, start + k));
  return out;
}

function cornerIndices(p: Vec3[], closed: boolean): number[] {
  const last = p.length - 1;
  const corners = closed ? [0] : [0, last];
  for (let i = 1; i < last; i++) {
    const a: Vec3 = [p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1], p[i][2] - p[i - 1][2]];
    const b: Vec3 = [p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1], p[i + 1][2] - p[i][2]];
    const la = Math.hypot(...a);
    const lb = Math.hypot(...b);
    if (la < 1e-9 || lb < 1e-9) continue;
    if ((a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb) < CORNER_COS) corners.push(i);
  }
  return corners;
}

function toWorld(points: Vec3[], m: ArrayLike<number> | undefined): Float32Array {
  const out = new Float32Array(points.length * 3);
  points.forEach(([x, y, z], i) => {
    if (m && m.length === 16) {
      out[i * 3] = m[0] * x + m[4] * y + m[8] * z + m[12];
      out[i * 3 + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
      out[i * 3 + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    } else {
      out.set([x, y, z], i * 3);
    }
  });
  return out;
}

function polylineOf(points: Vec3[], transform: number[] | undefined): EdgePolyline {
  const pts = toWorld(points, transform);
  const n = points.length;
  const closed = n > 2 && same(readV(pts, 0), readV(pts, n - 1));
  const circle = closed ? fitCircle(pts.subarray(0, (n - 1) * 3)) : null;
  return { pts, closed, corners: cornerIndices(Array.from({ length: n }, (_, i) => readV(pts, i)), closed), circle };
}

/** World-space edge polylines of every geometry (per-part transforms applied). */
export function buildEdgePolylines(geometries: readonly GeometryResult[]): EdgePolyline[] {
  const out: EdgePolyline[] = [];
  for (const g of geometries) {
    const { edges, edgeRanges } = g;
    if (!edges || !edgeRanges) continue;
    for (let r = 0; r + 1 < edgeRanges.length; r += 2) {
      const points = rangePoints(edges, edgeRanges[r], edgeRanges[r + 1]);
      if (points.length >= 2) out.push(polylineOf(points, g.transform));
    }
  }
  return out;
}

/** Geometries the user can actually see: hidden parts must not snap. */
export function visibleGeometries(
  geometries: readonly GeometryResult[],
  itemNames: readonly (string | null)[],
  hiddenIds: readonly string[],
): GeometryResult[] {
  return geometries.filter((g, i) => {
    const name = g.assemblyPartName ?? itemNames[i];
    return !(name && hiddenIds.includes(name));
  });
}
