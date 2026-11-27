// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Tight AABB for shapes with B-spline faces. OCCT's default `Bnd_Box` uses
// each B-spline face's pole box: an M6 `threadedRod` read 6.70 x 7.32 mm
// across instead of 6 x 6 mm. `BRepBndLib.AddOptimal` is exact but costs
// about 1 s on that rod. This reads the poles of only the faces that can
// move the box and refines them in JS (geometry/rationalPatchBounds.ts).
// Extruded spline faces follow their curve's pole hull too: a straight
// spline prism read 52.2 mm wide instead of 29.6 mm. Their exact box costs
// under 5 ms, so they use it. Analytic faces trimmed off their iso-lines
// overshoot too: the cored posts of the moulded housing (cylinders cut by a
// drafted roof) read 25.0152 mm high instead of 25 mm; they also take the
// exact box.

import { getOC } from 'replicad';
import type { Vec3 } from '../../../shared/intent/types';
import { offsetFaceBounds, rationalFaceBounds, toleranceInclusiveBounds } from './backendBounds';
import {
  emptyBox,
  exceeds,
  splineSurfaceBounds,
  unionBox,
  unwrapPeriodic,
  type Box6,
  type HPoint,
  type SplineSurface,
} from '../../geometry/rationalPatchBounds';
import { forEachSubShape } from './subShapeWalk';

/** Patch tightening tolerance (mm). Face tolerances are added on top.
 *  1e-4 mm doubles the cost on an M6 rod (about 10 k splits, not 5 k). */
const REFINE_TOL = 1e-3;
/** Bezier patch splits per call; past it, leaves keep their pole box. */
const SPLIT_BUDGET = 20_000;

/** AABB of the raw `TopoDS_Shape` `shape` when it has a strongly rational
 *  B-spline face (exact box) or an offset face (offset-aware box, then
 *  B-spline refinement); otherwise undefined. */
export function curvedFaceBounds(shape: unknown): { min: Vec3; max: Vec3 } | undefined {
  const rational = rationalFaceBounds(shape);
  if (rational) return rational;
  const offset = offsetFaceBounds(shape);
  return offset && withSplineFaceBounds(shape, offset);
}

/** `box` shrunk to the B-spline-aware bounds of the raw `TopoDS_Shape`
 *  `shape`, per side. Both are outer bounds, so their overlap is one too. */
export function withSplineFaceBounds(shape: unknown, box: { min: Vec3; max: Vec3 }): { min: Vec3; max: Vec3 } {
  const tight = splineFaceBounds(shape);
  if (!tight) return box;
  const min = box.min.map((v, a) => Math.max(v, tight.min[a])) as Vec3;
  const max = box.max.map((v, a) => Math.min(v, tight.max[a])) as Vec3;
  return min.every((v, a) => v <= max[a]) ? { min, max } : box;
}

/** Conservative AABB of the raw `TopoDS_Shape` that is tighter than the
 *  default box on faces whose default box passes the vertex box. Undefined
 *  when OCCT cannot read it; callers keep their default box then. */
export function splineFaceBounds(shape: unknown): { min: Vec3; max: Vec3 } | undefined {
  try {
    return readSplineFaceBounds(shape);
  } catch {
    return undefined;
  }
}

function readSplineFaceBounds(shape: unknown): { min: Vec3; max: Vec3 } | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const splineType = oc.GeomAbs_SurfaceType.GeomAbs_BSplineSurface;
  // Surface points known so far: every vertex lies on the shape.
  const inner = vertexBox(oc, shape);
  const budget = { splits: SPLIT_BUDGET };
  const out = emptyBox();
  forEachSubShape(oc, shape, 'FACE', (face) => {
    const box = defaultFaceBox(oc, face);
    const adaptor = new oc.BRepAdaptor_Surface_2(face, false);
    try {
      const spline = adaptor.GetType() === splineType;
      if (exceeds(box, inner, REFINE_TOL)) {
        // Other faces (e.g. extruded splines, the planar end caps of a
        // thread or prism, or trimmed analytic faces) are bounded by the
        // pole hulls of their edges or by their full iso-line range; their
        // exact box is cheap.
        const tight = spline ? refinedFaceBox(oc, adaptor, face, inner, budget) : exactFaceBox(face);
        if (tight) {
          for (let a = 0; a < 3; a++) {
            box[a] = Math.max(box[a], tight[a]);
            box[a + 3] = Math.min(box[a + 3], tight[a + 3]);
          }
        }
      }
    } finally {
      adaptor.delete();
    }
    unionBox(out, box);
  });
  const min: Vec3 = [out[0], out[1], out[2]];
  const max: Vec3 = [out[3], out[4], out[5]];
  for (let a = 0; a < 3; a++) {
    if (!Number.isFinite(min[a]) || !Number.isFinite(max[a]) || min[a] > max[a]) return undefined;
  }
  return { min, max };
}

function exactFaceBox(face: unknown): Box6 | undefined {
  const b = toleranceInclusiveBounds(face);
  return b && [b.min[0], b.min[1], b.min[2], b.max[0], b.max[1], b.max[2]];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function defaultFaceBox(oc: any, face: unknown): Box6 {
  const box = new oc.Bnd_Box_1();
  try {
    oc.BRepBndLib.Add(face, box, false);
    if (box.IsVoid()) return emptyBox();
    return readBox(box);
  } finally {
    box.delete();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readBox(box: any): Box6 {
  const lo = box.CornerMin();
  const hi = box.CornerMax();
  try {
    return [lo.X(), lo.Y(), lo.Z(), hi.X(), hi.Y(), hi.Z()];
  } finally {
    lo.delete();
    hi.delete();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function vertexBox(oc: any, shape: unknown): Box6 {
  const box = emptyBox();
  forEachSubShape(oc, shape, 'VERTEX', (vertex) => {
    const p = oc.BRep_Tool.Pnt(vertex);
    try {
      unionBox(box, [p.X(), p.Y(), p.Z(), p.X(), p.Y(), p.Z()]);
    } finally {
      p.delete();
    }
  });
  return box;
}

/** Refined pole box of one B-spline face over its UV bounds, enlarged by the
 *  face tolerance. Reads poles only: the surface handle may be shared with
 *  the face, so it must not be modified. */
/* eslint-disable @typescript-eslint/no-explicit-any -- untyped OCCT handles */
function refinedFaceBox(
  oc: any,
  adaptor: any,
  face: unknown,
  inner: Box6,
  budget: { splits: number },
): Box6 | undefined {
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const range = {
    u1: adaptor.FirstUParameter(),
    u2: adaptor.LastUParameter(),
    v1: adaptor.FirstVParameter(),
    v2: adaptor.LastVParameter(),
  };
  const handle = adaptor.BSpline();
  try {
    const surface = readSurface(handle.get(), range);
    if (!surface) return undefined;
    const box = splineSurfaceBounds(surface, range, inner, REFINE_TOL, budget);
    if (!box) return undefined;
    const tol = oc.BRep_Tool.Tolerance_1(face);
    for (let a = 0; a < 3; a++) {
      box[a] -= tol;
      box[a + 3] += tol;
    }
    return box;
  } finally {
    handle.delete();
  }
}

/** Non-periodic copy of the B-spline surface `s` over `range`. A periodic
 *  direction is unwrapped from its periodic flat knots, so the copy can
 *  repeat poles; `s` itself is not modified. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readSurface(s: any, range: { u1: number; u2: number; v1: number; v2: number }): SplineSurface | undefined {
  const u = axis(s.IsUPeriodic(), s.NbUPoles(), s.UDegree(), range.u1, range.u2, () => s.UKnotSequence_2(), () =>
    flatKnots(s.NbUKnots(), (k) => s.UKnot(k), (k) => s.UMultiplicity(k)),
  );
  const v = axis(s.IsVPeriodic(), s.NbVPoles(), s.VDegree(), range.v1, range.v2, () => s.VKnotSequence_2(), () =>
    flatKnots(s.NbVKnots(), (k) => s.VKnot(k), (k) => s.VMultiplicity(k)),
  );
  if (!u || !v) return undefined;
  const net: HPoint[][] = [];
  for (let i = 1; i <= s.NbUPoles(); i++) {
    const row: HPoint[] = [];
    for (let j = 1; j <= s.NbVPoles(); j++) {
      const p = s.Pole(i, j);
      const w = s.Weight(i, j);
      row.push([p.X() * w, p.Y() * w, p.Z() * w, w]);
      p.delete();
    }
    net.push(row);
  }
  return {
    uDegree: s.UDegree(),
    vDegree: s.VDegree(),
    uKnots: u.knots,
    vKnots: v.knots,
    poles: u.poleIndex.map((i) => v.poleIndex.map((j) => net[i][j])),
  };
}

/** Flat knots and pole indices of one surface direction. */
function axis(
  periodic: boolean,
  nPoles: number,
  degree: number,
  t1: number,
  t2: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  periodicSequence: () => any,
  flat: () => number[],
): { knots: number[]; poleIndex: number[] } | undefined {
  if (!periodic) return { knots: flat(), poleIndex: Array.from({ length: nPoles }, (_, i) => i) };
  const seq = periodicSequence();
  try {
    const period: number[] = [];
    for (let k = seq.Lower(); k <= seq.Upper(); k++) period.push(seq.Value(k));
    return unwrapPeriodic(period, nPoles, degree, t1, t2);
  } finally {
    seq.delete();
  }
}

function flatKnots(n: number, knot: (k: number) => number, mult: (k: number) => number): number[] {
  const out: number[] = [];
  for (let k = 1; k <= n; k++) for (let m = mult(k); m > 0; m--) out.push(knot(k));
  return out;
}
