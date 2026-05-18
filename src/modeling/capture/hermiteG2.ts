// NURBS Slice C Task 5 — hermiteG2 quintic Hermite transition curve.
//
// Pure-JS solver. Given two endpoints with prescribed point, first derivative
// (tangent), and (optional) second derivative (curvature), produce the 6
// Bezier control points of the quintic Hermite curve that interpolates both
// endpoints with matching tangents and matching curvatures (G2 continuity
// when joined to a neighbour with the same endpoint frame).
//
// The quintic-Hermite → Bezier conversion on [0, 1] is:
//
//   B0 = P0
//   B1 = P0 + T0 / 5
//   B2 = P0 + 2·T0 / 5 + C0 / 20
//   B3 = P1 - 2·T1 / 5 + C1 / 20
//   B4 = P1 - T1 / 5
//   B5 = P1
//
// (Curvature defaults to [0, 0, 0]; the result is a quintic-degree curve
// that is only G1, not G2, in that case — equivalent to a cubic Hermite
// lifted to degree 5.)
//
// The control points are emitted into a degree-5 nurbsCurve via Slice B's
// addCurve3D; the OCCT lowerer (Geom_BSplineCurve) generates a clamped
// uniform knot vector `clampedUniformKnots(6, 5)` = [0,0,0,0,0,0,1,1,1,1,1,1].

import type { Vec3 } from '../../shared/intent/types';
import { KernelError } from '../../shared/intent/kernelError';

/**
 * One end of a quintic Hermite transition curve.
 *
 * `point`     — position in mm.
 * `tangent`   — first derivative of the curve at this endpoint (NOT the unit
 *               tangent: magnitude controls how aggressively the curve heads
 *               out of the endpoint; typical magnitude is in the order of the
 *               chord length between the two endpoints).
 * `curvature` — second derivative of the curve at this endpoint. Defaults to
 *               the zero vector, which makes the curve G1-only.
 */
export interface HermiteEndpoint {
  point: Vec3;
  tangent: Vec3;
  curvature?: Vec3;
}

const ZERO: Vec3 = [0, 0, 0];

function isFiniteVec3(v: Vec3): boolean {
  return (
    Array.isArray(v) &&
    v.length === 3 &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1]) &&
    Number.isFinite(v[2])
  );
}

function magnitude(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

/**
 * Solve the quintic Hermite system at capture time and return the 6 Bezier
 * control points that interpolate the two endpoints with matching tangent
 * and curvature.
 *
 * Throws `KernelError` on:
 * - any NaN/Infinity in `point`, `tangent`, or `curvature`
 *   (`feature.hermite-g2.non-finite-input`);
 * - a tangent with magnitude < 1e-12 on either endpoint
 *   (`feature.hermite-g2.degenerate-tangent`).
 */
export function solveHermiteG2(a: HermiteEndpoint, b: HermiteEndpoint): Vec3[] {
  const aC: Vec3 = a.curvature ?? ZERO;
  const bC: Vec3 = b.curvature ?? ZERO;

  // Validation 1: non-finite inputs.
  if (
    !isFiniteVec3(a.point) ||
    !isFiniteVec3(a.tangent) ||
    !isFiniteVec3(aC) ||
    !isFiniteVec3(b.point) ||
    !isFiniteVec3(b.tangent) ||
    !isFiniteVec3(bC)
  ) {
    throw new KernelError(
      'feature.hermite-g2.non-finite-input',
      `hermiteG2: every coord of a.point / a.tangent / a.curvature / b.point / b.tangent / b.curvature must be a finite number. Got a={point:${JSON.stringify(a.point)}, tangent:${JSON.stringify(a.tangent)}, curvature:${JSON.stringify(a.curvature ?? null)}}, b={point:${JSON.stringify(b.point)}, tangent:${JSON.stringify(b.tangent)}, curvature:${JSON.stringify(b.curvature ?? null)}}.`,
      undefined,
      'hermite-g2.non-finite-input — replace NaN/Infinity coords with finite numbers, then retry.',
    );
  }

  // Validation 2: zero-magnitude tangent on either endpoint.
  const TANGENT_EPS = 1e-12;
  const aMag = magnitude(a.tangent);
  const bMag = magnitude(b.tangent);
  if (aMag < TANGENT_EPS || bMag < TANGENT_EPS) {
    throw new KernelError(
      'feature.hermite-g2.degenerate-tangent',
      `hermiteG2: tangent magnitude must be > 1e-12 on both endpoints; got |a.tangent|=${aMag}, |b.tangent|=${bMag}.`,
      undefined,
      'hermite-g2.degenerate-tangent — supply a tangent with magnitude in the order of the chord length between the two endpoints.',
    );
  }

  const [p0x, p0y, p0z] = a.point;
  const [p1x, p1y, p1z] = b.point;
  const [t0x, t0y, t0z] = a.tangent;
  const [t1x, t1y, t1z] = b.tangent;
  const [c0x, c0y, c0z] = aC;
  const [c1x, c1y, c1z] = bC;

  const B0: Vec3 = [p0x, p0y, p0z];
  const B1: Vec3 = [p0x + t0x / 5, p0y + t0y / 5, p0z + t0z / 5];
  const B2: Vec3 = [
    p0x + (2 * t0x) / 5 + c0x / 20,
    p0y + (2 * t0y) / 5 + c0y / 20,
    p0z + (2 * t0z) / 5 + c0z / 20,
  ];
  const B3: Vec3 = [
    p1x - (2 * t1x) / 5 + c1x / 20,
    p1y - (2 * t1y) / 5 + c1y / 20,
    p1z - (2 * t1z) / 5 + c1z / 20,
  ];
  const B4: Vec3 = [p1x - t1x / 5, p1y - t1y / 5, p1z - t1z / 5];
  const B5: Vec3 = [p1x, p1y, p1z];

  return [B0, B1, B2, B3, B4, B5];
}
