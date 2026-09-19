// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/nurbsSegmentPhases.ts
//
// Capture-time validation phases of `PathBuilder.nurbsSegment`, moved out
// verbatim so the method body stays small. Diagnostic codes, messages,
// hints, and evaluation order are unchanged.
import type { Param } from '../../shared/intent/types';
import { KernelError } from '../../shared/intent/kernelError';
import { toParam } from '../../shared/runtime/editableHelpers';
import type { Editable } from '../../shared/runtime/paramRef';

type NowFn = (p: Param) => number;

/** Resolve and validate `opts.degree` (default 3, integer ≥ 1). */
export function resolveNurbsDegree(optsDegree: number | undefined): number {
  const degree = optsDegree ?? 3;
  if (!Number.isInteger(degree) || degree < 1) {
    throw new KernelError(
      'feature.path.nurbs-segment.degenerate-controls',
      `path().nurbsSegment: degree must be an integer ≥ 1; got ${degree}.`,
      undefined,
      'path.nurbs-segment.degenerate-controls — degree must be an integer in [1, controlPoints.length - 1].',
    );
  }
  return degree;
}

/** Validate the control polygon and convert it to Param pairs. */
export function toNurbsControlPoints(
  controlPoints: Array<[Editable<number>, Editable<number>]>,
  degree: number,
  now: NowFn,
): Array<{ x: Param; y: Param }> {
  if (!Array.isArray(controlPoints) || controlPoints.length < degree + 1) {
    throw new KernelError(
      'feature.path.nurbs-segment.degenerate-controls',
      `path().nurbsSegment: need at least degree+1 = ${degree + 1} control points; got ${controlPoints?.length ?? 0}.`,
      undefined,
      'path.nurbs-segment.degenerate-controls — provide at least degree+1 finite Vec2 control points, with the first matching the current pen position within 1e-6 mm.',
    );
  }
  const paramControls: Array<{ x: Param; y: Param }> = [];
  for (let i = 0; i < controlPoints.length; i++) {
    const cp = controlPoints[i];
    if (!Array.isArray(cp) || cp.length !== 2) {
      throw new KernelError(
        'feature.path.nurbs-segment.degenerate-controls',
        `path().nurbsSegment: control point ${i} is not a [x, y] tuple.`,
        undefined,
        'path.nurbs-segment.degenerate-controls — provide at least degree+1 finite Vec2 control points, with the first matching the current pen position within 1e-6 mm.',
      );
    }
    const x = toParam(cp[0], 'mm');
    const y = toParam(cp[1], 'mm');
    if (!Number.isFinite(now(x)) || !Number.isFinite(now(y))) {
      throw new KernelError(
        'feature.path.nurbs-segment.degenerate-controls',
        `path().nurbsSegment: control point ${i} has non-finite coord (x=${now(x)}, y=${now(y)}).`,
        undefined,
        'path.nurbs-segment.degenerate-controls — provide at least degree+1 finite Vec2 control points, with the first matching the current pen position within 1e-6 mm.',
      );
    }
    paramControls.push({ x, y });
  }
  return paramControls;
}

/** First control point must match current pen position within 1e-6 mm. */
export function checkNurbsPenMatch(
  paramControls: Array<{ x: Param; y: Param }>,
  pen: { x: number; y: number } | null,
  now: NowFn,
): void {
  if (pen === null) {
    throw new KernelError(
      'feature.path.nurbs-segment.degenerate-controls',
      `path().nurbsSegment: no current pen position — call moveTo(x, y) before nurbsSegment.`,
      undefined,
      'path.nurbs-segment.degenerate-controls — provide at least degree+1 finite Vec2 control points, with the first matching the current pen position within 1e-6 mm.',
    );
  }
  const dx0 = now(paramControls[0].x) - pen.x;
  const dy0 = now(paramControls[0].y) - pen.y;
  if (Math.hypot(dx0, dy0) > 1e-6) {
    throw new KernelError(
      'feature.path.nurbs-segment.degenerate-controls',
      `path().nurbsSegment: controlPoints[0] = (${now(paramControls[0].x)}, ${now(paramControls[0].y)}) does not match current pen position (${pen.x}, ${pen.y}) within 1e-6 mm.`,
      undefined,
      'path.nurbs-segment.degenerate-controls — provide at least degree+1 finite Vec2 control points, with the first matching the current pen position within 1e-6 mm.',
    );
  }
}

/** Weights validation: one strictly positive finite weight per control point. */
export function toNurbsWeights(
  weights: number[] | undefined,
  controlPointCount: number,
): Param[] | undefined {
  let paramWeights: Param[] | undefined;
  if (weights !== undefined) {
    if (!Array.isArray(weights) || weights.length !== controlPointCount) {
      throw new KernelError(
        'feature.path.nurbs-segment.degenerate-controls',
        `path().nurbsSegment: weights length (${weights?.length ?? 0}) must equal controlPoints length (${controlPointCount}).`,
        undefined,
        'path.nurbs-segment.degenerate-controls — provide at least degree+1 finite Vec2 control points, with the first matching the current pen position within 1e-6 mm.',
      );
    }
    for (let i = 0; i < weights.length; i++) {
      const w = weights[i];
      if (!Number.isFinite(w) || w <= 0) {
        throw new KernelError(
          'feature.path.nurbs-segment.weights-non-positive',
          `path().nurbsSegment: weight[${i}] = ${w} must be a strictly positive finite number.`,
          undefined,
          'path.nurbs-segment.weights-non-positive — weights must be strictly positive (zero collapses the basis; negative is undefined for B-splines).',
        );
      }
    }
    paramWeights = weights.map((w) => toParam(w, 'unitless'));
  }
  return paramWeights;
}

/** Knots validation: length must be controlPoints.length + degree + 1. */
export function toNurbsKnots(
  knots: number[] | undefined,
  controlPointCount: number,
  degree: number,
): Param[] | undefined {
  let paramKnots: Param[] | undefined;
  if (knots !== undefined) {
    const expectedKnotLen = controlPointCount + degree + 1;
    if (!Array.isArray(knots) || knots.length !== expectedKnotLen) {
      throw new KernelError(
        'feature.path.nurbs-segment.degenerate-controls',
        `path().nurbsSegment: knots length (${knots?.length ?? 0}) must equal controlPoints.length + degree + 1 (${expectedKnotLen}).`,
        undefined,
        'path.nurbs-segment.degenerate-controls — provide at least degree+1 finite Vec2 control points, with the first matching the current pen position within 1e-6 mm.',
      );
    }
    paramKnots = knots.map((k) => toParam(k, 'unitless'));
  }
  return paramKnots;
}
