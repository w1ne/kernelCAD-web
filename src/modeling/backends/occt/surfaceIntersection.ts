// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { getOC } from 'replicad';
import type { Curve3DMetadata } from '../../../shared/intent/curve3dRecord';
import type { Vec3 } from '../../../shared/intent/types';

/**
 * Run `BRepAlgoAPI_Section` on two TopoDS_Shape operands and return the
 * section edges. GeomAPI_IntSS is not in the bundled wasm; Section is the
 * exact face-face path this wasm exposes (same as Surface.trimTo).
 */
export function sectionShapes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shapeA: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shapeB: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const section = new oc.BRepAlgoAPI_Section_3(shapeA, shapeB, false);
  try {
    section.ComputePCurveOn1(true);
    section.Approximation(true);
    section.Build(new oc.Message_ProgressRange_1());
    if (!section.IsDone()) {
      throw new Error('BRepAlgoAPI_Section failed to build');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const edges: any[] = [];
    const sectionShape = section.Shape();
    const exp = new oc.TopExp_Explorer_2(
      sectionShape,
      oc.TopAbs_ShapeEnum.TopAbs_EDGE,
      oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
    );
    try {
      for (; exp.More(); exp.Next()) {
        edges.push(oc.TopoDS.Edge_1(exp.Current()));
      }
    } finally {
      exp.delete();
    }
    return edges;
  } finally {
    section.delete();
  }
}

/**
 * Convert a section `TopoDS_Edge` to Curve3DMetadata (poles + knots) so the
 * result is a normal curve3d record that sweep / projectCurve / trim consume.
 */
export function edgeToCurve3DMetadata(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  edge: any,
): Curve3DMetadata {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const adaptor = new oc.BRepAdaptor_Curve_2(edge);
  try {
    const type = adaptor.GetType();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let bs: any;
    if (type === oc.GeomAbs_CurveType.GeomAbs_BSplineCurve) {
      const handle = adaptor.BSpline();
      bs = handle.get();
    } else {
      const u0 = adaptor.FirstParameter();
      const u1 = adaptor.LastParameter();
      const n = 32;
      const pts = new oc.TColgp_Array1OfPnt_2(1, n);
      const p = new oc.gp_Pnt_1();
      for (let i = 0; i < n; i++) {
        adaptor.D0(u0 + ((u1 - u0) * i) / (n - 1), p);
        pts.SetValue(i + 1, new oc.gp_Pnt_3(p.X(), p.Y(), p.Z()));
      }
      const fitter = new oc.GeomAPI_PointsToBSpline_2(
        pts,
        3,
        5,
        oc.GeomAbs_Shape.GeomAbs_C2,
        1e-3,
      );
      if (!fitter.IsDone()) {
        throw new Error('GeomAPI_PointsToBSpline failed on a section edge');
      }
      bs = fitter.Curve().get();
    }
    const nPoles = bs.NbPoles();
    const controlPoints: Vec3[] = [];
    const weights: number[] = [];
    for (let i = 1; i <= nPoles; i++) {
      const pole = bs.Pole(i);
      controlPoints.push([pole.X(), pole.Y(), pole.Z()]);
      weights.push(bs.Weight(i));
    }
    const nKnots = bs.NbKnots();
    const knots: number[] = [];
    for (let i = 1; i <= nKnots; i++) {
      const k = bs.Knot(i);
      const m = bs.Multiplicity(i);
      for (let j = 0; j < m; j++) knots.push(k);
    }
    const rational = typeof bs.IsRational === 'function' ? bs.IsRational() : weights.some((w) => Math.abs(w - 1) > 1e-12);
    // Always non-periodic: a geometrically closed section still has
    // nearly-coincident end poles, and OCCT's periodic constructor
    // rejects the expanded knot vector we emit here.
    return {
      controlPoints,
      degree: bs.Degree(),
      ...(rational ? { weights } : {}),
      knots,
      closed: false,
    };
  } finally {
    adaptor.delete?.();
  }
}
