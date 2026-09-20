// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Vec3 } from './types';

/**
 * Capture-time metadata for a Curve3D feature. A Curve3D is a 3D parametric
 * curve produced by `nurbsCurve(controlPoints, opts)` (and convenience peers
 * like `spline3d`). It is captured as a `FeatureRecord` of kind `'curve3d'`
 * and lowered to a `TopoDS_Edge` backed by `Geom_BSplineCurve` (direct
 * OCCT — no replicad wrapper). The proxy exposes synchronous `sample`,
 * `pointAt`, `tangentAt`, `length`, `domain` via a lazy-lower-on-first-call
 * pattern; the lower stores the edge on `session.importedGeometry` so it
 * survives subsequent capture calls.
 *
 * Validation rules (mirrored by `isCurve3DMetadata` below):
 * - `controlPoints` must have at least `degree + 1` entries, each a 3D
 *   point with finite coordinates.
 * - `degree` must be a positive integer.
 * - `weights`, when supplied, must have exactly `controlPoints.length`
 *   entries and every weight must be finite and strictly positive (a zero
 *   weight collapses the basis; a negative weight is geometrically
 *   meaningless for B-spline curves).
 * - `knots`, when supplied, must have exactly
 *   `controlPoints.length + degree + 1` entries (the standard non-periodic
 *   B-spline knot count). A monotonicity check is deferred to the lowerer
 *   so that the JS guard stays cheap.
 * - `closed` defaults to `false`; the lowerer reads it to decide whether
 *   to call `BRepBuilderAPI_MakeEdge` against a periodic curve.
 */
export interface Curve3DMetadata {
  controlPoints: Vec3[];
  degree: number;
  weights?: number[];
  knots?: number[];
  closed?: boolean;
}

/** A 3D point: exactly three finite numbers. */
function isVec3Array(p: unknown): boolean {
  if (!Array.isArray(p) || p.length !== 3) return false;
  if (!p.every((c) => typeof c === 'number' && Number.isFinite(c))) return false;
  return true;
}

/** `controlPoints` must have at least `degree + 1` finite 3D points and
 *  `degree` must be a positive integer. */
function hasValidControlPoints(m: Curve3DMetadata): boolean {
  if (!Array.isArray(m.controlPoints)) return false;
  if (typeof m.degree !== 'number' || !Number.isInteger(m.degree) || m.degree < 1) return false;
  if (m.controlPoints.length < m.degree + 1) return false;
  for (const p of m.controlPoints) {
    if (!isVec3Array(p)) return false;
  }
  return true;
}

/** `weights`, when supplied, must match the control-point count and be
 *  finite and strictly positive. */
function hasValidWeights(m: Curve3DMetadata): boolean {
  if (m.weights === undefined) return true;
  if (!Array.isArray(m.weights) || m.weights.length !== m.controlPoints.length) return false;
  if (!m.weights.every((w) => typeof w === 'number' && Number.isFinite(w) && w > 0)) return false;
  return true;
}

/** `knots`, when supplied, must have the standard non-periodic B-spline
 *  count of `controlPoints.length + degree + 1` finite entries. */
function hasValidKnots(m: Curve3DMetadata): boolean {
  if (m.knots === undefined) return true;
  const expectedKnots = m.controlPoints.length + m.degree + 1;
  if (!Array.isArray(m.knots) || m.knots.length !== expectedKnots) return false;
  if (!m.knots.every((k) => typeof k === 'number' && Number.isFinite(k))) return false;
  return true;
}

export function isCurve3DMetadata(value: unknown): value is Curve3DMetadata {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as Curve3DMetadata;

  if (!hasValidControlPoints(m)) return false;
  if (!hasValidWeights(m)) return false;
  if (!hasValidKnots(m)) return false;

  if (m.closed !== undefined && typeof m.closed !== 'boolean') return false;

  return true;
}
