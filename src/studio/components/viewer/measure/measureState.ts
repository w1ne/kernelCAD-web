// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { EdgePolyline } from './edgePolylines';
import type { SnapHit } from './measureSnap';
import { vadd, vcross, vdot, vnormalize, vscale, vsub, type CircleFit, type Vec3 } from './measureMath';

export interface DiameterMeasure { a: Vec3; b: Vec3; value: number }

export interface MeasureState {
  /** One-click diameter of a circular edge, drawn until the next measurement. */
  diameter: DiameterMeasure | null;
  a: Vec3 | null;
  b: Vec3 | null;
}

export const EMPTY_MEASURE: MeasureState = { diameter: null, a: null, b: null };

/** Diameter line through the centre, laid toward the clicked point. */
function diameterOf(circle: CircleFit, clicked: Vec3): DiameterMeasure {
  const off = vsub(clicked, circle.center);
  const inPlane = vsub(off, vscale(circle.normal, vdot(off, circle.normal)));
  const dir =
    vnormalize(inPlane) ?? vnormalize(vcross(circle.normal, [1, 0, 0])) ?? vnormalize(vcross(circle.normal, [0, 1, 0]))!;
  const r = vscale(dir, circle.radius);
  return { a: vsub(circle.center, r), b: vadd(circle.center, r), value: circle.radius * 2 };
}

/** First click of a measurement. A circular edge reads out its diameter at
 *  once and anchors the distance measurement at the circle's centre. */
function firstClick(hit: SnapHit, polylines: readonly EdgePolyline[]): MeasureState {
  const circle = hit.polyline === undefined ? null : polylines[hit.polyline]?.circle ?? null;
  if (!circle || hit.kind === 'face') return { diameter: null, a: hit.point, b: null };
  return { diameter: diameterOf(circle, hit.point), a: circle.center, b: null };
}

/** click 1 sets A, click 2 sets B, click 3 starts over (the last result stays until then). */
export function applyClick(state: MeasureState, hit: SnapHit, polylines: readonly EdgePolyline[]): MeasureState {
  if (state.a && !state.b) return { ...state, b: hit.point };
  return firstClick(hit, polylines);
}
