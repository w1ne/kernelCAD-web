// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { getOC } from 'replicad';
import {
  clampedUniformKnots,
  decomposeKnots,
} from '../../../kernel/backends/occt/nurbsSurfaceLowerer';
import type { Curve3DMetadata } from '../../../shared/intent/curve3dRecord';

/**
 * Result of lowering a `curve3d` record to OCCT.
 *
 * The edge is a `TopoDS_Edge` backed by a `Geom_BSplineCurve`. It is parked on
 * `session.importedGeometry` by the main lowerer so downstream consumers
 * (`variableSweep`, `surfaceFromBoundary`, and the lazy proxy that drives
 * `Curve3DProxy.{sample,pointAt,tangentAt,length,domain}`) can reach it.
 */
export interface Curve3DLowerResult {
  /** OCCT `TopoDS_Edge` wrapping a `Geom_BSplineCurve`. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  edge: any;
  /** Built, but worth telling the author (the caller turns these into
   *  diagnostics on its own feature). */
  warnings?: Curve3DLowerWarning[];
}

export interface Curve3DLowerWarning {
  code: 'feature.curve3d.closed-seam-kink';
  message: string;
}

/** Seam legs within this angle count as parallel (a smooth, C1 seam). */
const SEAM_PARALLEL_DEG = 0.5;

/**
 * A closed curve without knots is a clamped curve whose last pole repeats
 * the first: smooth at the seam only when the net's first and last legs are
 * collinear. Degree 1 is a polyline, cornered everywhere by design.
 */
function seamKinkWarning(m: Curve3DMetadata, pts: readonly (readonly number[])[]): Curve3DLowerWarning | undefined {
  if (m.closed !== true || m.knots !== undefined || m.degree < 2 || pts.length < 3) return undefined;
  const n = pts.length;
  const a = [0, 1, 2].map((k) => pts[1][k] - pts[0][k]);
  const b = [0, 1, 2].map((k) => pts[n - 1][k] - pts[n - 2][k]);
  const la = Math.hypot(a[0], a[1], a[2]);
  const lb = Math.hypot(b[0], b[1], b[2]);
  if (la < 1e-12 || lb < 1e-12) return undefined;
  const cos = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb);
  const angle = (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
  if (angle <= SEAM_PARALLEL_DEG) return undefined;
  return {
    code: 'feature.curve3d.closed-seam-kink',
    message:
      `closed nurbsCurve (degree ${m.degree}, no knots): the seam at [${pts[0].map((v) => Number(v.toFixed(3))).join(', ')}] ` +
      `is a ${angle.toFixed(1)}° corner (C0) — the first and last legs of the control net are not collinear.`,
  };
}

/**
 * Build a `TopoDS_Edge` from a validated `Curve3DMetadata`.
 *
 * Direct OCCT — no replicad wrapper. Capture-layer validation
 * (`isCurve3DMetadata` + `addCurve3D` diagnostics) is assumed to have
 * gate-checked the inputs; this function focuses on the OCCT call sequence.
 *
 * Constructor selection:
 *  - Non-rational (no weights): `Geom_BSplineCurve_1(Poles, Knots, Mults,
 *    Degree, Periodic)`.
 *  - Rational (weights present): `Geom_BSplineCurve_2(Poles, Weights, Knots,
 *    Mults, Degree, Periodic, CheckRational)`.
 *
 * Knot handling:
 *  - If the caller supplied an explicit knot vector, decompose it into
 *    distinct knots + per-knot multiplicities (OCCT's expected form).
 *  - Otherwise, generate a clamped-uniform knot vector via
 *    `clampedUniformKnots(n, degree)` (shared with the NURBS-surface lowerer).
 */
export function lowerCurve3D(m: Curve3DMetadata): Curve3DLowerResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const closed = closeControlNet(m);
  const n = closed.controlPoints.length;
  // A clamped knot vector cannot describe a periodic curve (OCCT throws), so a
  // `closed` curve without explicit knots is built as a clamped curve whose
  // first and last poles coincide: geometrically closed, and C1 at the seam
  // when the net's end tangents match (spline3d's closed net does).
  const periodic = (m.closed ?? false) && m.knots !== undefined;

  // 1-indexed (1..n) per OCCT convention.
  const polesArr = new oc.NCollection_Array1_gp_Pnt(1, n);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = closed.controlPoints[i];
    polesArr.SetValue(i + 1, new oc.gp_Pnt(x, y, z));
  }

  // Weights — only when explicitly provided. Capture-layer guarantees length
  // matches and every weight is finite and positive.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let weightsArr: any | undefined;
  if (closed.weights !== undefined) {
    weightsArr = new oc.NCollection_Array1_double(1, n);
    for (let i = 0; i < n; i++) {
      weightsArr.SetValue(i + 1, closed.weights[i]);
    }
  }

  // Knot decomposition — reuse the shared helpers from nurbsSurfaceLowerer so
  // the curve and surface paths agree on conventions (knot-vector form,
  // clamped-uniform inference).
  const decomposed = m.knots !== undefined
    ? decomposeKnots(m.knots)
    : clampedUniformKnots(n, m.degree);

  const knotsArr = new oc.NCollection_Array1_double(1, decomposed.knots.length);
  const multsArr = new oc.NCollection_Array1_int(1, decomposed.mults.length);
  for (let i = 0; i < decomposed.knots.length; i++) {
    knotsArr.SetValue(i + 1, decomposed.knots[i]);
    multsArr.SetValue(i + 1, decomposed.mults[i]);
  }

  // Build Geom_BSplineCurve via the constructor matching the input shape.
  const bspline = weightsArr !== undefined
    ? new oc.Geom_BSplineCurve(
        polesArr,
        weightsArr,
        knotsArr,
        multsArr,
        m.degree,
        periodic,
        false, // CheckRational — let OCCT trust the supplied weights as rational.
      )
    : new oc.Geom_BSplineCurve(
        polesArr,
        knotsArr,
        multsArr,
        m.degree,
        periodic,
      );

  // Wrap as TopoDS_Edge. BRepBuilderAPI_MakeEdge_24 takes a Handle_Geom_Curve;
  // Handle_Geom_Curve_2 wraps a raw Geom_Curve* pointer.
  const handle = bspline;
  const edgeBuilder = new oc.BRepBuilderAPI_MakeEdge(handle);
  const edge = edgeBuilder.Edge();

  const kink = seamKinkWarning(m, closed.controlPoints);
  return kink ? { edge, warnings: [kink] } : { edge };
}

/** For a `closed` curve with no explicit knots, append the first pole (and
 *  weight) when the net does not already end where it starts, so the clamped
 *  curve closes on itself. Every other curve passes through untouched. */
function closeControlNet(m: Curve3DMetadata): Pick<Curve3DMetadata, 'controlPoints' | 'weights'> {
  if (m.closed !== true || m.knots !== undefined) return m;
  const first = m.controlPoints[0];
  const last = m.controlPoints[m.controlPoints.length - 1];
  if (first.every((v, k) => Math.abs(v - last[k]) < 1e-9)) return m;
  return {
    controlPoints: [...m.controlPoints, first],
    ...(m.weights !== undefined ? { weights: [...m.weights, m.weights[0]] } : {}),
  };
}
