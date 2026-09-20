// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/splinePhases.ts
//
// Capture-time validation phases of `PathBuilder.spline`, moved out
// verbatim so the method body stays small. Diagnostic codes, messages,
// hints, and evaluation order are unchanged.
import type { Param } from '../../shared/intent/types';
import { KernelError } from '../../shared/intent/kernelError';
import { toParam } from '../../shared/runtime/editableHelpers';
import type { Editable } from '../../shared/runtime/paramRef';

type NowFn = (p: Param) => number;

/** Validate the waypoint list and convert every tuple to a Param pair. */
export function toSplineWaypoints(
  points: Array<[Editable<number>, Editable<number>]>,
  now: NowFn,
): Array<{ x: Param; y: Param }> {
  if (!Array.isArray(points) || points.length < 2) {
    throw new KernelError(
      'feature.path.spline.degenerate-points',
      `path().spline: need at least 2 waypoints; got ${points?.length ?? 0}.`,
      undefined,
      'path.spline.degenerate-points — pass at least 2 finite Vec2 waypoints (the path interpolates through every one).',
    );
  }
  const paramPoints: Array<{ x: Param; y: Param }> = [];
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (!Array.isArray(pt) || pt.length !== 2) {
      throw new KernelError(
        'feature.path.spline.degenerate-points',
        `path().spline: waypoint ${i} is not a [x, y] tuple.`,
        undefined,
        'path.spline.degenerate-points — pass at least 2 finite Vec2 waypoints (the path interpolates through every one).',
      );
    }
    const x = toParam(pt[0], 'mm');
    const y = toParam(pt[1], 'mm');
    if (!Number.isFinite(now(x)) || !Number.isFinite(now(y))) {
      throw new KernelError(
        'feature.path.spline.degenerate-points',
        `path().spline: waypoint ${i} has non-finite coord (x=${now(x)}, y=${now(y)}).`,
        undefined,
        'path.spline.degenerate-points — pass at least 2 finite Vec2 waypoints (the path interpolates through every one).',
      );
    }
    paramPoints.push({ x, y });
  }
  return paramPoints;
}

/** Reject consecutive duplicates (closer than 1e-9 mm). */
export function checkSplineConsecutiveDistinct(
  paramPoints: Array<{ x: Param; y: Param }>,
  now: NowFn,
): void {
  for (let i = 1; i < paramPoints.length; i++) {
    const dx = now(paramPoints[i].x) - now(paramPoints[i - 1].x);
    const dy = now(paramPoints[i].y) - now(paramPoints[i - 1].y);
    if (Math.hypot(dx, dy) < 1e-9) {
      throw new KernelError(
        'feature.path.spline.degenerate-points',
        `path().spline: waypoints ${i - 1} and ${i} are coincident (< 1e-9 mm apart).`,
        undefined,
        'path.spline.degenerate-points — pass at least 2 finite Vec2 waypoints (the path interpolates through every one).',
      );
    }
  }
}

/** points[0] must match the current pen position within 1e-6 mm. */
export function checkSplinePenMatch(
  paramPoints: Array<{ x: Param; y: Param }>,
  pen: { x: number; y: number } | null,
  now: NowFn,
): void {
  if (pen === null) {
    throw new KernelError(
      'feature.path.spline.degenerate-points',
      `path().spline: no current pen position — call moveTo(x, y) before spline.`,
      undefined,
      'path.spline.degenerate-points — start the path with moveTo(points[0][0], points[0][1]) so the spline has a start position to chain from.',
    );
  }
  const penDx = now(paramPoints[0].x) - pen.x;
  const penDy = now(paramPoints[0].y) - pen.y;
  if (Math.hypot(penDx, penDy) > 1e-6) {
    throw new KernelError(
      'feature.path.spline.degenerate-points',
      `path().spline: points[0] = (${now(paramPoints[0].x)}, ${now(paramPoints[0].y)}) does not match current pen position (${pen.x}, ${pen.y}) within 1e-6 mm.`,
      undefined,
      'path.spline.degenerate-points — the spline starts where the previous segment ended: make points[0] equal the current pen position, or add a lineTo(points[0][0], points[0][1]) before the spline.',
    );
  }
}

/** Validate an optional tangent constraint ([x, y] tuple, finite, non-zero). */
export function toSplineTangent(
  label: 'startTangent' | 'endTangent',
  t: [Editable<number>, Editable<number>] | undefined,
  now: NowFn,
): { x: Param; y: Param } | undefined {
  if (t === undefined) return undefined;
  if (!Array.isArray(t) || t.length !== 2) {
    throw new KernelError(
      'feature.path.spline.tangent-zero-magnitude',
      `path().spline: ${label} must be a [x, y] tuple; got ${JSON.stringify(t)}.`,
      undefined,
      'Pass a non-zero 2D direction vector [x, y]. Magnitude is normalised; direction matters.',
    );
  }
  const x = toParam(t[0], 'mm');
  const y = toParam(t[1], 'mm');
  const xv = now(x);
  const yv = now(y);
  if (!Number.isFinite(xv) || !Number.isFinite(yv)) {
    throw new KernelError(
      'feature.path.spline.tangent-zero-magnitude',
      `path().spline: ${label} has non-finite coord (x=${xv}, y=${yv}).`,
      undefined,
      'Pass a finite non-zero 2D direction vector. Magnitude is normalised; direction matters.',
    );
  }
  const mag = Math.hypot(xv, yv);
  if (mag < 1e-9) {
    throw new KernelError(
      'feature.path.spline.tangent-zero-magnitude',
      `path().spline: ${label} has magnitude ${mag} (< 1e-9); got [${xv}, ${yv}].`,
      undefined,
      'Pass a non-zero 2D direction vector. Magnitude is normalised; direction matters.',
    );
  }
  return { x, y };
}
