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
  const n = m.controlPoints.length;
  const periodic = m.closed ?? false;

  // 1-indexed (1..n) per OCCT convention.
  const polesArr = new oc.TColgp_Array1OfPnt_2(1, n);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = m.controlPoints[i];
    polesArr.SetValue(i + 1, new oc.gp_Pnt_3(x, y, z));
  }

  // Weights — only when explicitly provided. Capture-layer guarantees length
  // matches and every weight is finite and positive.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let weightsArr: any | undefined;
  if (m.weights !== undefined) {
    weightsArr = new oc.TColStd_Array1OfReal_2(1, n);
    for (let i = 0; i < n; i++) {
      weightsArr.SetValue(i + 1, m.weights[i]);
    }
  }

  // Knot decomposition — reuse the shared helpers from nurbsSurfaceLowerer so
  // the curve and surface paths agree on conventions (knot-vector form,
  // clamped-uniform inference).
  const decomposed = m.knots !== undefined
    ? decomposeKnots(m.knots)
    : clampedUniformKnots(n, m.degree);

  const knotsArr = new oc.TColStd_Array1OfReal_2(1, decomposed.knots.length);
  const multsArr = new oc.TColStd_Array1OfInteger_2(1, decomposed.mults.length);
  for (let i = 0; i < decomposed.knots.length; i++) {
    knotsArr.SetValue(i + 1, decomposed.knots[i]);
    multsArr.SetValue(i + 1, decomposed.mults[i]);
  }

  // Build Geom_BSplineCurve via the constructor matching the input shape.
  const bspline = weightsArr !== undefined
    ? new oc.Geom_BSplineCurve_2(
        polesArr,
        weightsArr,
        knotsArr,
        multsArr,
        m.degree,
        periodic,
        false, // CheckRational — let OCCT trust the supplied weights as rational.
      )
    : new oc.Geom_BSplineCurve_1(
        polesArr,
        knotsArr,
        multsArr,
        m.degree,
        periodic,
      );

  // Wrap as TopoDS_Edge. BRepBuilderAPI_MakeEdge_24 takes a Handle_Geom_Curve;
  // Handle_Geom_Curve_2 wraps a raw Geom_Curve* pointer.
  const handle = new oc.Handle_Geom_Curve_2(bspline);
  const edgeBuilder = new oc.BRepBuilderAPI_MakeEdge_24(handle);
  const edge = edgeBuilder.Edge();

  return { edge };
}
