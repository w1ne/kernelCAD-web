// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { EdgePolyline } from './edgePolylines';
import { vlerp, type Vec3 } from './measureMath';

export interface ScreenPoint { x: number; y: number }
/** A projected point: pixel position plus its distance from the camera. */
export interface Projected extends ScreenPoint { depth: number }

export interface SnapHit {
  /** vertex (edge corner) > edge (nearest point on a polyline) > face. */
  kind: 'vertex' | 'edge' | 'face';
  point: Vec3;
  /** Index into the polyline list for vertex and edge hits. */
  polyline?: number;
}

export interface SnapContext {
  polylines: readonly EdgePolyline[];
  cursor: ScreenPoint;
  /** World point -> pixels + camera distance; null when behind the camera. */
  project: (p: Vec3) => Projected | null;
  /** Nearest visible mesh hit under the cursor, if any. */
  face: { point: Vec3; distance: number } | null;
  vertexRadius?: number;
  edgeRadius?: number;
}

export const VERTEX_SNAP_PX = 12;
export const EDGE_SNAP_PX = 8;

const pointAt = (a: Float32Array, i: number): Vec3 => [a[i * 3], a[i * 3 + 1], a[i * 3 + 2]];

/** An edge point is hidden when the mesh under the cursor is clearly nearer. */
function visible(depth: number, face: SnapContext['face']): boolean {
  return !face || depth <= face.distance + Math.max(0.5, face.distance * 0.01);
}

function projectAll(pl: EdgePolyline, project: SnapContext['project']): (Projected | null)[] {
  const n = pl.pts.length / 3;
  return Array.from({ length: n }, (_, i) => project(pointAt(pl.pts, i)));
}

function nearestCorner(ctx: SnapContext, proj: (Projected | null)[][]): SnapHit | null {
  const max = ctx.vertexRadius ?? VERTEX_SNAP_PX;
  let best: SnapHit | null = null;
  let bestD = max;
  ctx.polylines.forEach((pl, pi) => {
    for (const i of pl.corners) {
      const s = proj[pi][i];
      if (!s || !visible(s.depth, ctx.face)) continue;
      const d = Math.hypot(s.x - ctx.cursor.x, s.y - ctx.cursor.y);
      if (d < bestD) { bestD = d; best = { kind: 'vertex', point: pointAt(pl.pts, i), polyline: pi }; }
    }
  });
  return best;
}

/** Parameter of the screen-space closest point to `c` on segment a-b. */
function segmentParam(a: ScreenPoint, b: ScreenPoint, c: ScreenPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-9) return 0;
  return Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.y - a.y) * dy) / l2));
}

function nearestOnEdges(ctx: SnapContext, proj: (Projected | null)[][]): SnapHit | null {
  let best: SnapHit | null = null;
  let bestD = ctx.edgeRadius ?? EDGE_SNAP_PX;
  ctx.polylines.forEach((pl, pi) => {
    const s = proj[pi];
    for (let i = 0; i + 1 < s.length; i++) {
      const a = s[i];
      const b = s[i + 1];
      if (!a || !b) continue;
      const t = segmentParam(a, b, ctx.cursor);
      const d = Math.hypot(a.x + (b.x - a.x) * t - ctx.cursor.x, a.y + (b.y - a.y) * t - ctx.cursor.y);
      if (d >= bestD || !visible(a.depth + (b.depth - a.depth) * t, ctx.face)) continue;
      bestD = d;
      best = { kind: 'edge', point: vlerp(pointAt(pl.pts, i), pointAt(pl.pts, i + 1), t), polyline: pi };
    }
  });
  return best;
}

/** Snap priority: edge corners, then the nearest point on an edge, then the face. */
export function computeSnap(ctx: SnapContext): SnapHit | null {
  const proj = ctx.polylines.map((pl) => projectAll(pl, ctx.project));
  return (
    nearestCorner(ctx, proj) ??
    nearestOnEdges(ctx, proj) ??
    (ctx.face ? { kind: 'face', point: ctx.face.point } : null)
  );
}
