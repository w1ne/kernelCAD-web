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
// The mm -> m conversion happens here once; callers always see SI.
//
// Implementation note: this build of opencascade.js does NOT bind
// `gp_Mat` or `GProp_PrincipalProps`, so `MatrixOfInertia()` is
// unavailable. We reconstruct the 6 unique components of the symmetric
// inertia tensor via six `MomentOfInertia(gp_Ax1)` calls — three about
// the X/Y/Z axes through the CoM (the diagonal components Ixx, Iyy, Izz)
// and three about diagonal axes ((X+Y)/√2 etc.) from which the products
// of inertia Ixy, Ixz, Iyz follow from the identity
//   M(n) = n^T · I · n
// applied to a unit vector at 45° between two principal axes.

import { getOC } from 'replicad';
import type { Vec3 } from '../../shared/intent/types';

export interface MassProperties {
  /** Mass in kg, assuming the declared density. */
  mass: number;
  /** Centre of mass in shape-local mm. */
  com: Vec3;
  /** Symmetric 6-vector [ixx, ixy, ixz, iyy, iyz, izz] in kg*m^2 about the CoM. */
  inertia6: [number, number, number, number, number, number];
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

  // Per-axis moments at unit density (mm^5). The six axes pass through the
  // CoM so the values are already centroidal moments — no parallel-axis
  // correction needed. Scaling to SI happens via INERTIA_SCALE_PER_DENSITY.
  const Mx = momentOfInertiaAlong(oc, props, c, [1, 0, 0]);
  const My = momentOfInertiaAlong(oc, props, c, [0, 1, 0]);
  const Mz = momentOfInertiaAlong(oc, props, c, [0, 0, 1]);
  const INV_SQRT2 = 1 / Math.SQRT2;
  const Mxy = momentOfInertiaAlong(oc, props, c, [INV_SQRT2, INV_SQRT2, 0]);
  const Mxz = momentOfInertiaAlong(oc, props, c, [INV_SQRT2, 0, INV_SQRT2]);
  const Myz = momentOfInertiaAlong(oc, props, c, [0, INV_SQRT2, INV_SQRT2]);

  // M(n) = n^T I n. For diagonal unit vector (1/√2, 1/√2, 0):
  //   Mxy = (Ixx + Iyy)/2 + Ixy  ⇒  Ixy = Mxy - (Ixx + Iyy)/2.
  // Same shape for Ixz and Iyz.
  const Ixx = Mx;
  const Iyy = My;
  const Izz = Mz;
  const Ixy = Mxy - (Ixx + Iyy) / 2;
  const Ixz = Mxz - (Ixx + Izz) / 2;
  const Iyz = Myz - (Iyy + Izz) / 2;

  const k = density * INERTIA_SCALE_PER_DENSITY;
  return {
    mass: massKg,
    com,
    inertia6: [Ixx * k, Ixy * k, Ixz * k, Iyy * k, Iyz * k, Izz * k],
  };
}

/** Moment of inertia about an axis through `centre` aligned with `dir`. */
function momentOfInertiaAlong(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  centre: any,
  dir: Vec3,
): number {
  const d = new oc.gp_Dir_4(dir[0], dir[1], dir[2]);
  const axis = new oc.gp_Ax1_2(centre, d);
  return props.MomentOfInertia(axis);
}
