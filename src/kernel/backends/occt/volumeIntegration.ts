// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Volume integration for reported volume and mass properties.
//
// `BRepGProp::VolumeProperties` without a tolerance integrates every face
// with a fixed Gauss order. That is exact to ~1e-13 on planes, analytic
// surfaces, extrusions and revolutions, and close on the near-polynomial
// B-spline faces of threads and sweeps, but not on strongly rational faces:
// a non-uniform `scale` turns circles into B-splines with weights 1 and 0.5,
// and `cylinder(1, 1).scale([2, 1, 1])` measured 6.3373 mm³ instead of
// 2π = 6.2832 mm³ (0.86 % high). The adaptive overload is used only when a
// face's weights spread by more than `RATIONAL_WEIGHT_SPREAD`. It is worse
// on the thread faces (weight spread <= 1.04): -1.8e-4 against -7e-6 for
// M5 x 4, so those keep the fixed-order result.

import { getOC } from 'replicad';

/** Relative error target for adaptive volume integration. The achieved
 *  error is about 1e4 times larger: 7e-10 on the scaled cylinder above. */
export const VOLUME_RELATIVE_EPS = 1e-13;

/** Largest/smallest pole weight above which a B-spline face is integrated
 *  adaptively. Circles converted to B-splines spread by sqrt(2) (90 degree
 *  arcs) or 2 (120 degree arcs). */
export const RATIONAL_WEIGHT_SPREAD = 1.25;

/**
 * Fill `props` (a `GProp_GProps`) with the volume properties of the raw
 * `TopoDS_Shape` `shape`. Open shells still contribute (OnlyClosed=false).
 */
export function integrateVolumeProperties(shape: unknown, props: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  if (hasStronglyRationalFace(shape)) {
    try {
      oc.BRepGProp.VolumeProperties_2(shape, props, VOLUME_RELATIVE_EPS, false, false);
      return;
    } catch {
      // Fall through to the fixed-order integration.
    }
  }
  oc.BRepGProp.VolumeProperties_1(shape, props, false, false, false);
}

/** Signed volume (mm³) of the raw `TopoDS_Shape` `shape`. */
export function integrateVolume(shape: unknown): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const props = new oc.GProp_GProps_1();
  try {
    integrateVolumeProperties(shape, props);
    return props.Mass();
  } finally {
    props.delete();
  }
}

/** True when a B-spline face of the raw `TopoDS_Shape` `shape` has pole
 *  weights that spread by more than `RATIONAL_WEIGHT_SPREAD`. */
export function hasStronglyRationalFace(shape: unknown): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const spline = oc.GeomAbs_SurfaceType.GeomAbs_BSplineSurface;
  const exp = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  try {
    for (; exp.More(); exp.Next()) {
      const surface = new oc.BRepAdaptor_Surface_2(oc.TopoDS.Face_1(exp.Current()), false);
      try {
        if (surface.GetType() !== spline || !(surface.IsURational() || surface.IsVRational())) continue;
        const handle = surface.BSpline();
        try {
          if (weightSpread(handle.get()) > RATIONAL_WEIGHT_SPREAD) return true;
        } finally {
          handle.delete();
        }
      } finally {
        surface.delete();
      }
    }
  } finally {
    exp.delete();
  }
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function weightSpread(bspline: any): number {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 1; i <= bspline.NbUPoles(); i++) {
    for (let j = 1; j <= bspline.NbVPoles(); j++) {
      const w = bspline.Weight(i, j);
      if (w < lo) lo = w;
      if (w > hi) hi = w;
    }
  }
  return lo > 0 ? hi / lo : Infinity;
}
