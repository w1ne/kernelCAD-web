// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/capture/sketchCommand.ts
//
// Leaf module for the SketchCommand discriminated union.
//
// SketchCommand is the wire format for path segments captured by
// modeling/capture/sketch.ts (PathBuilder) and consumed at lowering time by
// the kernel/ OCCT backend (occtBackend.ts, cutoutLowerer.ts) and by
// authoring/validation/cutoutValidation.ts.
//
// It is extracted here — into shared/, the lowest layer — so the kernel can
// type-import it without depending on modeling/. The runtime classes
// (PathBuilder, Sketch) and the `makePath` factory stay in
// modeling/capture/sketch.ts; only the data-shape type lives here.
import type { Param } from '../intent/types';

export type SketchCommand =
  | { kind: 'moveTo'; x: Param; y: Param }
  | { kind: 'lineTo'; x: Param; y: Param }
  | { kind: 'tangentArc'; x: Param; y: Param }
  | { kind: 'threePointsArc'; x: Param; y: Param; midX: Param; midY: Param }
  | { kind: 'sagittaArc'; x: Param; y: Param; sagitta: Param }
  | { kind: 'bulgeArc'; x: Param; y: Param; bulge: Param }
  | { kind: 'radiusArc'; x: Param; y: Param; radius: Param }
  // C1-smooth spline segment from current pen position to (x, y). The
  // tangent at the start is inherited from the prior segment (so the join
  // is smooth), and the end tangent is chosen automatically by replicad's
  // smoothSplineTo. Useful for organic outlines (Wayfarer brow, ergonomic
  // grips) where chained arcs hit OCCT BlendChain solver cliffs.
  | { kind: 'smoothSpline'; x: Param; y: Param }
  // NURBS Slice D — 2D path NURBS authoring.
  //
  // `spline` — N-waypoint interpolation. `points[0]` MUST match the current
  // pen position (i.e. the path already moved there); the lowerer threads
  // a B-spline approximation through every waypoint, leaving the pen at
  // `points[N-1]`. Use for organic outlines (eyewear brow, ergonomic
  // grips) when you have measured waypoints rather than a closed-form
  // control-net.
  //
  // V slice — `startTangent` and `endTangent` (optional) constrain the
  // first-derivative direction at the first and last waypoint. When
  // either is present, the lowerer routes through the analytics-side
  // tangent-constrained interpolator instead of the fast approximation
  // path; the resulting curve is round-tripped through OCCT so the
  // authoritative geometry stays kernel-native.
  | {
      kind: 'spline';
      points: Array<{ x: Param; y: Param }>;
      tension?: Param;
      startTangent?: { x: Param; y: Param };
      endTangent?: { x: Param; y: Param };
    }
  // `nurbsSegment` — explicit B-spline segment. `controlPoints[0]` MUST
  // match the current pen position; `controlPoints[N-1]` becomes the new
  // pen position. Validates `degree+1 <= controlPoints.length`.
  // Optional `weights` array (length must equal controlPoints) makes the
  // segment rational; optional `knots` overrides the default clamped
  // uniform knot vector. Use for explicit NURBS authoring where the
  // control-net is the primary mental model.
  | { kind: 'nurbsSegment'; controlPoints: Array<{ x: Param; y: Param }>; degree: Param; weights?: Param[]; knots?: Param[] }
  // `hermiteG2_2d` — quintic Hermite transition between two endpoints with
  // matching tangent (and optional curvature) — the 2D analogue of
  // Slice C's 3D `hermiteG2`. `(ax, ay)` MUST match the current pen
  // position within 1e-6 mm; the pen ends at `(bx, by)`. Used for G2-
  // continuous blends between adjacent path runs (eyewear bridge → brow,
  // sneaker midsole transitions).
  | {
      kind: 'hermiteG2_2d';
      ax: Param; ay: Param; atx: Param; aty: Param; acx?: Param; acy?: Param;
      bx: Param; by: Param; btx: Param; bty: Param; bcx?: Param; bcy?: Param;
    }
  | { kind: 'close' };
