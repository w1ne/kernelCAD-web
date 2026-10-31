// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Near-coincident cylinders between boolean operands.
 *
 * OCCT's exact boolean handles faces that are exactly coincident (same plane,
 * same cylinder) and faces that are clearly apart. Between the two it fails
 * quietly: a tool cylinder 6e-4 mm off the axis of an imported bore of the same
 * radius fused into a BRepCheck-valid solid whose export mesh cracked along the
 * bore (CADGenBench 202). The same tube on the exact axis fused watertight.
 *
 * Such a gap is far below any manufacturing or STEP-exchange tolerance, so it
 * is one surface written twice with rounding: typically a tool placed from
 * coordinates rounded to 3 decimals (at most 7.1e-4 mm off across two axes)
 * against an import that carries 9. The caller runs the boolean with a fuzzy
 * value covering the gap, which is what OCCT's fuzzy option is for.
 *
 * Only cylinders are compared, and only face pairs whose bounding boxes
 * overlap. Planes are left alone on purpose: cutters routinely overshoot a
 * face by 0.01 mm (the hole lowerer) or 1e-3 mm (scripts), and that overshoot
 * must stay an exact boolean.
 */

import type { getOC } from 'replicad';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OC = any;

/** Gaps at or below this are exact coincidence for OCCT (Precision::Confusion
 *  is 1e-7; face tolerances on clean geometry stay near it). */
export const NEAR_COINCIDENT_MIN_MM = 1e-6;
/** Gaps above this are distinct surfaces (a 0.02 mm lip is a modelled step). */
export const NEAR_COINCIDENT_MAX_MM = 1e-3;
const PARALLEL_TOL = 1e-9;

type Vec = [number, number, number];

interface CylinderFace {
  /** A point on the axis. */
  loc: Vec;
  /** Axis direction (unit). */
  dir: Vec;
  radius: number;
  min: Vec;
  max: Vec;
}

function dot(a: Vec, b: Vec): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function sub(a: Vec, b: Vec): Vec {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function xyz(p: { X(): number; Y(): number; Z(): number }): Vec {
  return [p.X(), p.Y(), p.Z()];
}

/** Cylindrical faces of `shape`. Classify the surface before building a box:
 *  only cylinder faces need extents, so large B-spline bodies avoid an OCCT
 *  bounding-box calculation for every unrelated face. With `within`, cylinder
 *  faces whose box misses it are skipped before reading their axis. */
function cylinderFaces(oc: OC, shape: unknown, within?: { min: Vec; max: Vec }): CylinderFace[] {
  const out: CylinderFace[] = [];
  const cylinderType = oc.GeomAbs_SurfaceType.GeomAbs_Cylinder;
  const exp = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  try {
    for (; exp.More(); exp.Next()) {
      const face = oc.TopoDS.Face_1(exp.Current());
      const surface = new oc.BRepAdaptor_Surface_2(face, true);
      try {
        if (surface.GetType() !== cylinderType) continue;
        const box = new oc.Bnd_Box_1();
        let bounds: { min: Vec; max: Vec };
        try {
          oc.BRepBndLib.Add(face, box, false);
          if (box.IsVoid()) continue;
          const lo = box.CornerMin();
          const hi = box.CornerMax();
          bounds = { min: xyz(lo), max: xyz(hi) };
          lo.delete();
          hi.delete();
          if (within && !boxesOverlap(bounds, within, NEAR_COINCIDENT_MAX_MM)) continue;
        } finally {
          box.delete();
        }
        const cylinder = surface.Cylinder();
        const axis = cylinder.Axis();
        const location = axis.Location();
        const direction = axis.Direction();
        out.push({ loc: xyz(location), dir: xyz(direction), radius: cylinder.Radius(), ...bounds });
        for (const h of [location, direction, axis, cylinder]) h.delete();
      } finally {
        surface?.delete();
      }
    }
  } finally {
    exp.delete();
  }
  return out;
}

function boxesOverlap(a: { min: Vec; max: Vec }, b: { min: Vec; max: Vec }, pad: number): boolean {
  for (let k = 0; k < 3; k++) {
    if (a.max[k] + pad < b.min[k] || b.max[k] + pad < a.min[k]) return false;
  }
  return true;
}

/** Separation of two cylinders (radius difference plus axis offset), or
 *  undefined when their axes are not parallel. */
function cylinderGap(a: CylinderFace, b: CylinderFace): number | undefined {
  if (Math.abs(Math.abs(dot(a.dir, b.dir)) - 1) > PARALLEL_TOL) return undefined;
  const rel = sub(b.loc, a.loc);
  const along = dot(rel, a.dir);
  const axisOffset = Math.hypot(rel[0] - a.dir[0] * along, rel[1] - a.dir[1] * along, rel[2] - a.dir[2] * along);
  return Math.abs(a.radius - b.radius) + axisOffset;
}

/**
 * Largest gap between a body cylinder and a tool cylinder that are the same
 * cylinder up to a 1e-6..1e-3 mm offset, with overlapping extents. Undefined
 * when no pair is near-coincident.
 */
export function nearCoincidentGap(oc: ReturnType<typeof getOC>, body: unknown, tools: readonly unknown[]): number | undefined {
  const o = oc as OC;
  const toolFaces = tools.flatMap((t) => cylinderFaces(o, t));
  if (toolFaces.length === 0) return undefined;
  const within = {
    min: [0, 1, 2].map((k) => Math.min(...toolFaces.map((f) => f.min[k]))) as Vec,
    max: [0, 1, 2].map((k) => Math.max(...toolFaces.map((f) => f.max[k]))) as Vec,
  };
  const bodyFaces = cylinderFaces(o, body, within);
  let worst: number | undefined;
  for (const t of toolFaces) {
    for (const b of bodyFaces) {
      if (!boxesOverlap(t, b, NEAR_COINCIDENT_MAX_MM)) continue;
      const gap = cylinderGap(t, b);
      if (gap === undefined || gap <= NEAR_COINCIDENT_MIN_MM || gap > NEAR_COINCIDENT_MAX_MM) continue;
      worst = Math.max(worst ?? 0, gap);
    }
  }
  return worst;
}
