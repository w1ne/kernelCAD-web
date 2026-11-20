// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Optimal (non-padded) AABB helper for raw TopoDS shapes. Split out of
// occtBackend.ts so the overlap-bounds probe does not push that module over
// the max-lines ratchet.

import { getOC } from 'replicad';
import type { Vec3 } from '../../../shared/intent/types';
import { hasStronglyRationalFace } from './volumeIntegration';

/** Optimal AABB of a raw TopoDS shape, or undefined when OCCT cannot build
 *  one. Bounds are diagnostic sugar: a failure must not fail the caller. */
export function optimalBoundsOf(shape: unknown): { min: Vec3; max: Vec3 } | undefined {
  return readOptimalBox(shape, false);
}

/** Exact-geometry AABB of a raw TopoDS shape, including shape tolerances and
 *  without triangulation. Undefined when OCCT cannot build a finite box.
 *  A tessellated hull can fall inside a curved face; this call does not. */
export function toleranceInclusiveBounds(shape: unknown): { min: Vec3; max: Vec3 } | undefined {
  return readOptimalBox(shape, true);
}

/** Exact, tolerance-inclusive AABB when the raw shape has a strongly rational
 *  B-spline face; otherwise undefined. On those faces the default `Bnd_Box`
 *  follows the weighted control hull: `cylinder(1, 1).scale([2, 1, 1])` read
 *  6 x 3.46 x 1 mm instead of 4 x 2 x 1 mm. The exact box costs 1 to 35 ms
 *  on such shapes. Thread faces are not gated: the exact box costs 0.45 to
 *  1.1 s there; splineFaceBounds.ts tightens them instead. */
export function rationalFaceBounds(shape: unknown): { min: Vec3; max: Vec3 } | undefined {
  try {
    return hasStronglyRationalFace(shape) ? toleranceInclusiveBounds(shape) : undefined;
  } catch {
    return undefined;
  }
}

function readOptimalBox(
  shape: unknown,
  useShapeTolerance: boolean,
): { min: Vec3; max: Vec3 } | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const box = new oc.Bnd_Box_1();
  try {
    oc.BRepBndLib.AddOptimal(shape, box, false, useShapeTolerance);
    if (box.IsVoid() || box.IsWhole?.() === true) return undefined;
    const lo = box.CornerMin();
    const hi = box.CornerMax();
    try {
      const min: Vec3 = [lo.X(), lo.Y(), lo.Z()];
      const max: Vec3 = [hi.X(), hi.Y(), hi.Z()];
      if (!finiteBox(min, max)) return undefined;
      return { min, max };
    } finally {
      lo.delete();
      hi.delete();
    }
  } catch {
    return undefined;
  } finally {
    box.delete();
  }
}

function finiteBox(min: Vec3, max: Vec3): boolean {
  for (let axis = 0; axis < 3; axis++) {
    if (!Number.isFinite(min[axis]) || !Number.isFinite(max[axis])) return false;
    if (min[axis] > max[axis]) return false;
  }
  return true;
}
