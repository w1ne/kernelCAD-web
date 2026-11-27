// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Optimal (non-padded) AABB helper for raw TopoDS shapes. Split out of
// occtBackend.ts so the overlap-bounds probe does not push that module over
// the max-lines ratchet.

import { getOC } from 'replicad';
import type { Vec3 } from '../../../shared/intent/types';
import { forEachSubShape } from './subShapeWalk';
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
    return hasStronglyRationalFace(shape) ? prunedExactBounds(shape) : undefined;
  } catch {
    return undefined;
  }
}

/** Same box as `toleranceInclusiveBounds(shape)`, but only the faces that can
 *  move it get an exact box. The running box starts as the vertices enlarged
 *  by their tolerances. A face is skipped when its default box, enlarged by
 *  the largest edge or vertex tolerance of the shape, stays inside the
 *  running box. SO100_Assembly.step (3811 faces): 2.0 s whole-shape, 0.4 s
 *  here, same box. */
export function prunedExactBounds(shape: unknown): { min: Vec3; max: Vec3 } | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  const pad = seedVertexBox(oc, shape, min, max);
  let failed = false;
  forEachSubShape(oc, shape, 'FACE', (face) => {
    if (defaultBoxInside(oc, face, pad, min, max)) return;
    const box = toleranceInclusiveBounds(face);
    if (!box) {
      failed = true;
      return false;
    }
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], box.min[a]);
      max[a] = Math.max(max[a], box.max[a]);
    }
  });
  return !failed && finiteBox(min, max) ? { min, max } : undefined;
}

/** Grow `min`/`max` over every vertex of `shape`, enlarged by its tolerance.
 *  Returns the largest edge or vertex tolerance of the shape. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function seedVertexBox(oc: any, shape: unknown, min: Vec3, max: Vec3): number {
  let pad = 0;
  forEachSubShape(oc, shape, 'VERTEX', (vertex) => {
    const tol = oc.BRep_Tool.Tolerance_3(vertex);
    pad = Math.max(pad, tol);
    const p = oc.BRep_Tool.Pnt(vertex);
    try {
      const c = [p.X(), p.Y(), p.Z()];
      for (let a = 0; a < 3; a++) {
        min[a] = Math.min(min[a], c[a] - tol);
        max[a] = Math.max(max[a], c[a] + tol);
      }
    } finally {
      p.delete();
    }
  });
  forEachSubShape(oc, shape, 'EDGE', (edge) => {
    pad = Math.max(pad, oc.BRep_Tool.Tolerance_2(edge));
  });
  return pad;
}

/** True when the default `Bnd_Box` of `face`, enlarged by `pad`, lies inside
 *  `min`/`max`. A face with a void box adds nothing, so it counts as inside. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function defaultBoxInside(oc: any, face: unknown, pad: number, min: Vec3, max: Vec3): boolean {
  const box = new oc.Bnd_Box_1();
  try {
    oc.BRepBndLib.Add(face, box, false);
    if (box.IsVoid()) return true;
    const lo = box.CornerMin();
    const hi = box.CornerMax();
    try {
      const l = [lo.X(), lo.Y(), lo.Z()];
      const h = [hi.X(), hi.Y(), hi.Z()];
      return [0, 1, 2].every((a) => l[a] - pad >= min[a] && h[a] + pad <= max[a]);
    } finally {
      lo.delete();
      hi.delete();
    }
  } finally {
    box.delete();
  }
}

/** AABB of the raw `TopoDS_Shape` `shape` when it has an offset-surface face
 *  (`thicken()` on a curved surface); otherwise undefined. The default
 *  `Bnd_Box` bounds such a face by its basis surface and stores the offset
 *  distance as the box gap, which the caller removes as tolerance: the
 *  pocket-watch crystal, thickened by 0.4 mm, read z max 3.2 instead of 3.6.
 *  Offset faces use their exact box; other faces their gap-free default box,
 *  whose union is the caller's box. B-spline faces keep their pole hull;
 *  splineFaceBounds.ts tightens them. */
export function offsetFaceBounds(shape: unknown): { min: Vec3; max: Vec3 } | undefined {
  try {
    return readOffsetFaceBounds(shape);
  } catch {
    return undefined;
  }
}

function readOffsetFaceBounds(shape: unknown): { min: Vec3; max: Vec3 } | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const offsetType = oc.GeomAbs_SurfaceType.GeomAbs_OffsetSurface;
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  let sawOffset = false;
  let failed = false;
  forEachSubShape(oc, shape, 'FACE', (face) => {
    const surface = new oc.BRepAdaptor_Surface_2(face, false);
    let offset: boolean;
    try {
      offset = surface.GetType() === offsetType;
    } finally {
      surface.delete();
    }
    sawOffset ||= offset;
    const box = offset ? toleranceInclusiveBounds(face) : gapFreeBounds(oc, face);
    if (!box) {
      failed = true;
      return false;
    }
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], box.min[a]);
      max[a] = Math.max(max[a], box.max[a]);
    }
  });
  return !failed && sawOffset && finiteBox(min, max) ? { min, max } : undefined;
}

/** Default `Bnd_Box` of a non-offset face without its tolerance gap. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function gapFreeBounds(oc: any, face: unknown): { min: Vec3; max: Vec3 } | undefined {
  const box = new oc.Bnd_Box_1();
  try {
    oc.BRepBndLib.Add(face, box, false);
    if (box.IsVoid()) return undefined;
    const gap = box.GetGap();
    const lo = box.CornerMin();
    const hi = box.CornerMax();
    try {
      return { min: [lo.X() + gap, lo.Y() + gap, lo.Z() + gap], max: [hi.X() - gap, hi.Y() - gap, hi.Z() - gap] };
    } finally {
      lo.delete();
      hi.delete();
    }
  } finally {
    box.delete();
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

/**
 * Default OCCT box of the raw TopoDS `shape` from its geometry, never its triangulation.
 * replicad's `Shape.boundingBox` reads the triangulation once the shape is
 * meshed, and mesh vertices lie inside curved faces: after `getMesh()`,
 * `cylinder(5, 10)` read x from -9.9756 instead of -10. OCCT's Bnd_Box
 * inflates bounds by a tolerance gap; remove it so that exact
 * axis-aligned primitives report integral coordinates.
 */
export function geometryBox(shape: unknown): { min: Vec3; max: Vec3 } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const bb = new oc.Bnd_Box_1();
  try {
    oc.BRepBndLib.Add(shape, bb, false);
    // An empty shape throws, as replicad's box does.
    if (bb.IsVoid()) throw new Error('Bnd_Box is void');
    const lo = bb.CornerMin();
    const hi = bb.CornerMax();
    const gap = bb.GetGap();
    try {
      return {
        min: [lo.X() + gap, lo.Y() + gap, lo.Z() + gap],
        max: [hi.X() - gap, hi.Y() - gap, hi.Z() - gap],
      };
    } finally {
      lo.delete();
      hi.delete();
    }
  } finally {
    bb.delete();
  }
}
