// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Optimal (non-padded) AABB helper for raw TopoDS shapes. Split out of
// occtBackend.ts so the overlap-bounds probe does not push that module over
// the max-lines ratchet.

import { getOC } from 'replicad';
import type { Vec3 } from '../../../shared/intent/types';

/** Optimal AABB of a raw TopoDS shape, or undefined when OCCT cannot build
 *  one. Bounds are diagnostic sugar: a failure must not fail the caller. */
export function optimalBoundsOf(shape: unknown): { min: Vec3; max: Vec3 } | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const box = new oc.Bnd_Box_1();
  try {
    oc.BRepBndLib.AddOptimal(shape, box, false, false);
    if (box.IsVoid()) return undefined;
    const lo = box.CornerMin();
    const hi = box.CornerMax();
    try {
      return { min: [lo.X(), lo.Y(), lo.Z()], max: [hi.X(), hi.Y(), hi.Z()] };
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
