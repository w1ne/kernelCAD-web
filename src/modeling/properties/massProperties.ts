// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/properties/massProperties.ts
//
// Pure wrapper over OCCT's BRepGProp::VolumeProperties. Mirrors the
// existing curve3dEval.ts:118 pattern for BRepGProp::LinearProperties.
//
// Units:
//   - shape geometry is mm (kernelCAD-native)
//   - density is kg/m^3 (SI; URDF + SDF convention)
//   - returned mass is kg
//   - returned CoM is in shape-local mm
//   - returned inertia6 is [ixx, ixy, ixz, iyy, iyz, izz] in kg*m^2
//
//   - returned principal moments are kg*m^2, principal axes are unit vectors
//   - returned radiusOfGyration is in shape-local mm (density-cancelling)
//
// The mm -> m conversion happens here once; callers always see SI.
//
// Implementation note: `GProp_GProps::MatrixOfInertia()` returns a `gp_Mat`,
// which is NOT registered with embind — calling it from JS throws
// `BindingError: unbound types` at RUNTIME (it type-checks fine, so the
// failure only shows up under execution). The kcad OCCT build therefore ships
// a static `oc.GPropWrapper` that reads the matrix and the principal
// properties out component-by-component as plain numbers. Always go through
// the wrapper; never call `MatrixOfInertia()` or `PrincipalProperties()`
// directly.
//
// OCCT reports both the inertia matrix and the principal properties about the
// CENTRE OF MASS, not about the shape origin, so no parallel-axis correction
// is applied here. Verified numerically against the closed form for a
// 20x10x30 box: diag = V*(b^2+c^2)/12 etc. exactly.

import { getOC } from 'replicad';
import type { Vec3 } from '../../shared/intent/types';

/** An axis in shape-local mm: a point on the axis plus a direction (need not be unit). */
export interface GyrationAxis {
  origin: Vec3;
  direction: Vec3;
}

export interface MassProperties {
  /** Mass in kg, assuming the declared density. */
  mass: number;
  /** Centre of mass in shape-local mm. */
  com: Vec3;
  /** Symmetric 6-vector [ixx, ixy, ixz, iyy, iyz, izz] in kg*m^2 about the CoM. */
  inertia6: [number, number, number, number, number, number];
  /**
   * Full symmetric 3x3 centroidal inertia tensor in kg*m^2, row-major.
   * Same data as `inertia6`, in the shape most physics/robotics code wants.
   */
  inertiaMatrix: [Vec3, Vec3, Vec3];
  /**
   * The three principal moments of inertia in kg*m^2, about the CoM.
   * `principalMoments[i]` corresponds to `principalAxes[i]`. Ordering is
   * OCCT's own — it is NOT sorted.
   */
  principalMoments: [number, number, number];
  /** Unit direction of each principal axis, in shape-local coordinates. */
  principalAxes: [Vec3, Vec3, Vec3];
  /**
   * True when the shape's principal moments are degenerate about an axis /
   * a point respectively — i.e. OCCT detected rotational / spherical
   * symmetry of the mass distribution. A generic box reports false for both.
   */
  hasSymmetryAxis: boolean;
  hasSymmetryPoint: boolean;
  /**
   * Radius of gyration in mm about the caller-supplied axis. Present only
   * when `gyrationAxis` was passed. Independent of density (both the moment
   * and the mass scale with it), which is why it stays in mm rather than SI.
   */
  radiusOfGyration?: number;
}

const MM3_TO_M3 = 1e-9;
// (kg/m^3) * (mm^3 -> m^3) * (mm^2 -> m^2) = density * 1e-9 * 1e-6 = density * 1e-15.
const INERTIA_SCALE_PER_DENSITY = 1e-15;

/**
 * Compute mass / CoM / inertia tensor of a raw `TopoDS_Shape` handle.
 *
 * `occtShape` is the raw OCCT shape pointer (`shape.wrapped` on a replicad
 * `Shape3D`). The wrapper builds a `GProp_GProps` instance, fills it via
 * `BRepGProp::VolumeProperties`, then converts the result into SI units
 * scaled by the caller-supplied density.
 */
export function computeMassProperties(
  occtShape: unknown,
  density: number = 1000,
  gyrationAxis?: GyrationAxis,
): MassProperties {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;

  const props = new oc.GProp_GProps_1();
  // VolumeProperties_1(S, VProps, OnlyClosed, SkipShared, UseTriangulation).
  // OnlyClosed=false so open shells still contribute volume integration;
  // SkipShared/UseTriangulation=false matches the LinearProperties call in
  // curve3dEval.ts.
  oc.BRepGProp.VolumeProperties_1(occtShape, props, false, false, false);

  const volumeMm3 = props.Mass();
  const massKg = volumeMm3 * MM3_TO_M3 * density;

  const c = props.CentreOfMass();
  const com: Vec3 = [c.X(), c.Y(), c.Z()];

  // Centroidal inertia tensor at unit density (mm^5), read out of the
  // unbound gp_Mat one component at a time. GPropWrapper indices are
  // 1-BASED (OCCT convention), unlike the 0-based principal-props indices
  // right below — the asymmetry is OCCT's, not ours.
  const k = density * INERTIA_SCALE_PER_DENSITY;
  const m = (i: number, j: number): number =>
    oc.GPropWrapper.MatrixOfInertiaValue(props, i, j) * k;

  // Symmetrise explicitly: OCCT's integration leaves the two halves of the
  // tensor differing in the last bits, and callers (URDF/MJCF) require an
  // exactly symmetric matrix.
  const Ixx = m(1, 1);
  const Iyy = m(2, 2);
  const Izz = m(3, 3);
  const Ixy = (m(1, 2) + m(2, 1)) / 2;
  const Ixz = (m(1, 3) + m(3, 1)) / 2;
  const Iyz = (m(2, 3) + m(3, 2)) / 2;

  const principalMoments = [0, 1, 2].map(
    i => oc.GPropWrapper.PrincipalMoment(props, i) * k,
  ) as [number, number, number];
  const principalAxes = [0, 1, 2].map(
    axis =>
      [0, 1, 2].map(comp =>
        oc.GPropWrapper.PrincipalAxisComponent(props, axis, comp),
      ) as Vec3,
  ) as [Vec3, Vec3, Vec3];

  const result: MassProperties = {
    mass: massKg,
    com,
    inertia6: [Ixx, Ixy, Ixz, Iyy, Iyz, Izz],
    inertiaMatrix: [
      [Ixx, Ixy, Ixz],
      [Ixy, Iyy, Iyz],
      [Ixz, Iyz, Izz],
    ],
    principalMoments,
    principalAxes,
    hasSymmetryAxis: Boolean(oc.GPropWrapper.HasSymmetryAxis(props)),
    hasSymmetryPoint: Boolean(oc.GPropWrapper.HasSymmetryPoint(props)),
  };

  if (gyrationAxis) {
    result.radiusOfGyration = radiusOfGyrationAbout(oc, props, gyrationAxis);
  }
  return result;
}

/**
 * Radius of gyration (mm) about an arbitrary axis, via
 * `GProp_GProps::RadiusOfGyration` — which, unlike `MatrixOfInertia`, IS
 * bound directly because `gp_Ax1` is a registered type.
 *
 * Unlike the tensor above this is about the caller's axis wherever it sits,
 * NOT about the centroid; OCCT applies the parallel-axis shift internally.
 */
function radiusOfGyrationAbout(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any,
  { origin, direction }: GyrationAxis,
): number {
  const len = Math.hypot(direction[0], direction[1], direction[2]);
  if (!(len > 0)) {
    throw new Error(
      'radiusOfGyration axis direction must be a non-zero vector; got [0, 0, 0].',
    );
  }
  const p = new oc.gp_Pnt_3(origin[0], origin[1], origin[2]);
  // gp_Dir normalises, but a zero-length input would abort inside wasm rather
  // than throw a catchable JS error, hence the guard above.
  const d = new oc.gp_Dir_4(direction[0], direction[1], direction[2]);
  const axis = new oc.gp_Ax1_2(p, d);
  return props.RadiusOfGyration(axis);
}
