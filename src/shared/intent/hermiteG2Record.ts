// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Vec3 } from './types';

/**
 * Endpoint constraint for a `hermiteG2(a, b)` quintic Hermite transition
 * curve. Captures the G2-continuous boundary data the agent supplies at
 * each end of the curve: position, tangent, and (optionally) curvature
 * second-derivative vector plus a tangent-magnitude weight.
 *
 * Validation rules:
 * - `point` and `tangent` are required and must be finite Vec3.
 * - `curvature` defaults to `[0, 0, 0]` (geometric line / G1-only).
 * - `weight` defaults to `1.0` (no rescale on the tangent). Must be
 *   strictly positive; zero would degenerate the quintic to a cubic by
 *   collapsing the B1/B4 control points onto B0/B5 (which the math still
 *   handles, but it's a malformed input from the agent's standpoint).
 */
export interface HermiteG2Endpoint {
  point: Vec3;
  tangent: Vec3;
  curvature?: Vec3;
  weight?: number;
}

/**
 * Capture-time metadata for a `hermiteG2(a, b)` feature.
 *
 * Lowering is purely JS-side: the quintic Hermite system at both endpoints
 * is solved analytically into 6 Bezier control points (`buildHermiteG2-
 * ControlPoints` in Task 5), and the result is forwarded to Slice B's
 * `addCurve3D({ controlPoints, degree: 5, closed: false })` which builds a
 * `Geom_BSplineCurve` with degree=5 and a single-segment clamped knot
 * vector. The audit (2026-05-18) confirmed the curve3dLowerer happily
 * accepts degree=5 with 6 control points.
 *
 * Storing the original `(a, b)` endpoint data on the metadata record (rather
 * than just the 6 control points) is deliberate: it lets the recompute
 * pipeline re-run the quintic solver when an upstream Param changes one of
 * the endpoint tangents / curvatures, without having to invert the Bezier
 * representation back to Hermite form.
 */
export interface HermiteG2Metadata {
  /** Start-point constraint. */
  endA: HermiteG2Endpoint;
  /** End-point constraint. */
  endB: HermiteG2Endpoint;
}

function isVec3(v: unknown): v is Vec3 {
  if (!Array.isArray(v) || v.length !== 3) return false;
  return v.every((c) => typeof c === 'number' && Number.isFinite(c));
}

export function isHermiteG2Endpoint(value: unknown): value is HermiteG2Endpoint {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as HermiteG2Endpoint;
  if (!isVec3(e.point)) return false;
  if (!isVec3(e.tangent)) return false;
  if (e.curvature !== undefined && !isVec3(e.curvature)) return false;
  if (e.weight !== undefined) {
    if (typeof e.weight !== 'number' || !Number.isFinite(e.weight) || e.weight <= 0) return false;
  }
  return true;
}

export function isHermiteG2Metadata(value: unknown): value is HermiteG2Metadata {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as HermiteG2Metadata;
  return isHermiteG2Endpoint(m.endA) && isHermiteG2Endpoint(m.endB);
}
