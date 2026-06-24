// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { getOC } from 'replicad';
import * as replicad from 'replicad';

/**
 * Result of lowering a `surfaceTrim` record to OCCT — a trimmed/split
 * `replicad.Face` ready to feed into `thickenFace` / `faceToShape` / `sew`,
 * exactly like a `buildNurbsFace` result.
 */
export interface SurfaceTrimLowerResult {
  /** Replicad-wrapped trimmed `TopoDS_Face`. */
  face: replicad.Face;
}

/**
 * Surface area of a `replicad.Face` via `BRepGProp.SurfaceProperties`.
 * Exported for tests + the keep-piece heuristic.
 */
export function faceArea(face: replicad.Face): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props = new oc.GProp_GProps_1();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc.BRepGProp.SurfaceProperties_1((face as any).wrapped, props, false, false);
  const m = props.Mass();
  props.delete();
  return m;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function shapeArea(oc: any, shape: any): number {
  const props = new oc.GProp_GProps_1();
  oc.BRepGProp.SurfaceProperties_1(shape, props, false, false);
  const m = props.Mass();
  props.delete();
  return m;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrap(face: replicad.Face): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (face as any).wrapped;
}

/** Average surface normal of a replicad Face at its parametric center. */
function baseNormal(face: replicad.Face): [number, number, number] {
  const c = face.center;
  const n = face.normalAt([c.x, c.y, c.z]);
  const len = Math.hypot(n.x, n.y, n.z) || 1;
  return [n.x / len, n.y / len, n.z / len];
}

/** Thrown by `lowerSurfaceTrim` when a base/cutter patch is not near-planar.
 *  The dispatch arm pattern-matches this to emit
 *  `feature.surface-trim.non-planar` (return base unchanged + diagnostic). */
export class NonPlanarTrimError extends Error {}

/**
 * Near-planar guard. The slab/half-space trim path prisms each patch along a
 * single average normal, so a curved base or cutter would be silently
 * mis-trimmed. We refuse rather than mis-trim.
 *
 * Primary check (cheap, exact): `BRepAdaptor_Surface.GetType() == GeomAbs_Plane`
 * — both `BRepAdaptor_Surface_2` and `GeomAbs_SurfaceType.GeomAbs_Plane` are
 * confirmed bound in this wasm build (used by `holeDetection.ts` /
 * `meshing.ts`). A genuinely planar NURBS face (degree-1 control net in a
 * plane) reports `GeomAbs_Plane` here.
 *
 * Fallback (for analytic-plane-but-not-flagged or BSpline-that-is-flat): sample
 * the surface normal at the four corners + centre of the UV domain and require
 * the max angular divergence from the centre normal to stay under `tolDeg`.
 * Uses `BRepAdaptor_Surface.D1` (bound) to build per-sample normals.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isNearPlanar(oc: any, faceShape: any, tolDeg = 2): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adaptor = new oc.BRepAdaptor_Surface_2(faceShape, true);
  try {
    const type = adaptor.GetType();
    if (type.value === oc.GeomAbs_SurfaceType.GeomAbs_Plane.value) return true;

    // Sample normals across the UV domain via D1 (first derivatives → normal).
    const u0 = adaptor.FirstUParameter();
    const u1 = adaptor.LastUParameter();
    const v0 = adaptor.FirstVParameter();
    const v1 = adaptor.LastVParameter();
    const us = [u0, u1, 0.5 * (u0 + u1)];
    const vs = [v0, v1, 0.5 * (v0 + v1)];

    const normals: Array<[number, number, number]> = [];
    for (const u of us) {
      for (const v of vs) {
        const p = new oc.gp_Pnt_1();
        const d1u = new oc.gp_Vec_1();
        const d1v = new oc.gp_Vec_1();
        adaptor.D1(u, v, p, d1u, d1v);
        // normal = d1u × d1v
        const nx = d1u.Y() * d1v.Z() - d1u.Z() * d1v.Y();
        const ny = d1u.Z() * d1v.X() - d1u.X() * d1v.Z();
        const nz = d1u.X() * d1v.Y() - d1u.Y() * d1v.X();
        p.delete();
        d1u.delete();
        d1v.delete();
        const len = Math.hypot(nx, ny, nz);
        if (len > 1e-9) normals.push([nx / len, ny / len, nz / len]);
      }
    }
    if (normals.length < 2) return true; // degenerate sampling — don't block

    const ref = normals[Math.floor(normals.length / 2)] ?? normals[0];
    const tolCos = Math.cos((tolDeg * Math.PI) / 180);
    for (const n of normals) {
      const dot = Math.abs(n[0] * ref[0] + n[1] * ref[1] + n[2] * ref[2]);
      if (dot < tolCos) return false;
    }
    return true;
  } finally {
    adaptor.delete();
  }
}

/**
 * Lower a `surfaceTrim` record: cut `baseFace` against `cutter` and return the
 * trimmed face.
 *
 * **OCCT reality (audited 2026-06-23 against `replicad-opencascadejs`
 * kcad-v0.23.1).** The plan's `BRepFeat_SplitShape` and `BRepAlgoAPI_Splitter`
 * are NOT bound in this wasm build, and `BRep_Tool.CurveOnSurface` returns an
 * unbound `Handle_Geom2d_Curve` — so the pcurve-on-surface UV-split path is
 * also unavailable. The robust path that uses only confirmed-bound classes:
 *
 *  1. `BRepAlgoAPI_Section` (bound) to confirm the surfaces actually cross —
 *     no section edges ⇒ throw so the dispatch arm emits
 *     `feature.surface-trim.no-intersection`.
 *  2. Prism the base face a hair along its own normal into a thin slab solid
 *     (`BRepPrimAPI_MakePrism`).
 *  3. Build a thick half-space wall from the cutter (`BRepPrimAPI_MakePrism`
 *     along the cutter normal, extended far past the base bounds) and
 *     `BRepAlgoAPI_Common` it against the slab to recover the two sides.
 *  4. Pick the kept piece by area (`largest` for `trim`), then extract the
 *     trimmed base face as the slab cap nearest the original base face
 *     (`BRepExtrema_DistShapeShape` ≈ 0) — the bottom cap coincides with the
 *     base surface, the top cap is offset by the prism vector.
 *
 * Well-conditioned (clean axis-aligned crossing) input only; OCCT Section is
 * fragile on degenerate/tangent input.
 */
export function lowerSurfaceTrim(
  baseFace: replicad.Face,
  cutter: replicad.Face,
  // `op` is accepted for API symmetry; both trim and split currently return
  // the larger surviving piece (split-into-both-halves deferred to Slice F).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _op: 'trim' | 'split',
): SurfaceTrimLowerResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const baseShape = unwrap(baseFace);
  const cutterShape = unwrap(cutter);

  // 0. Near-planar guard. The slab/half-space path below prisms each patch
  //    along a single average normal, so a curved base or cutter would be
  //    silently mis-trimmed. Refuse rather than ship a wrong result — the
  //    dispatch arm turns NonPlanarTrimError into
  //    `feature.surface-trim.non-planar` (base returned unchanged).
  if (!isNearPlanar(oc, baseShape)) {
    throw new NonPlanarTrimError(
      'surfaceTrim: base surface is not near-planar; the planar slab-trim path would mis-trim a curved patch (curved surface trim is deferred).',
    );
  }
  if (!isNearPlanar(oc, cutterShape)) {
    throw new NonPlanarTrimError(
      'surfaceTrim: cutter surface is not near-planar; the planar slab-trim path would mis-trim against a curved cutter (curved surface trim is deferred).',
    );
  }

  // 1. Section — verify the two surfaces actually intersect.
  const section = new oc.BRepAlgoAPI_Section_3(baseShape, cutterShape, false);
  section.ComputePCurveOn1(true);
  section.Approximation(true);
  section.Build(new oc.Message_ProgressRange_1());
  if (!section.IsDone()) {
    throw new Error('surfaceTrim: BRepAlgoAPI_Section failed to build');
  }
  const sectionShape = section.Shape();
  let sectionEdges = 0;
  {
    const exp = new oc.TopExp_Explorer_2(
      sectionShape,
      oc.TopAbs_ShapeEnum.TopAbs_EDGE,
      oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
    );
    for (; exp.More(); exp.Next()) sectionEdges++;
  }
  if (sectionEdges === 0) {
    throw new Error('surfaceTrim: no section curve — surfaces do not intersect');
  }

  // 2. Prism the base face into a thin slab along its normal.
  const bn = baseNormal(baseFace);
  // Magnitude small relative to the geometry but well above tolerance.
  const eps = 0.05;
  const prismVec = new oc.gp_Vec_4(bn[0] * eps, bn[1] * eps, bn[2] * eps);
  const slabMaker = new oc.BRepPrimAPI_MakePrism_1(baseShape, prismVec, false, true);
  slabMaker.Build(new oc.Message_ProgressRange_1());
  const slab = slabMaker.Shape();

  // 3. Sweep the cutter along its OWN normal into a one-sided half-space solid
  //    that brackets the +normal side of the cutter, big enough to fully
  //    contain whatever portion of the base lies on that side.
  const cn = baseNormal(cutter);
  const reach = 1000; // far past any realistic base extent
  const wallVec = new oc.gp_Vec_4(cn[0] * reach, cn[1] * reach, cn[2] * reach);
  const wallMaker = new oc.BRepPrimAPI_MakePrism_1(cutterShape, wallVec, false, true);
  wallMaker.Build(new oc.Message_ProgressRange_1());
  const wall = wallMaker.Shape();

  // 4. The half-space splits the slab into the +normal side (Common) and the
  //    −normal side (Cut).
  // The 3-arg (S1, S2, ProgressRange) ctor builds in the constructor; no
  // separate .Build() needed (confirmed against the .d.ts ctor signature).
  const common = new oc.BRepAlgoAPI_Common_3(slab, wall, new oc.Message_ProgressRange_1());
  const pieceA = common.Shape();

  const cut = new oc.BRepAlgoAPI_Cut_3(slab, wall, new oc.Message_ProgressRange_1());
  const pieceB = cut.Shape();

  const areaA = shapeArea(oc, pieceA);
  const areaB = shapeArea(oc, pieceB);

  // 'trim' keeps the larger surviving piece. 'split' (single-face form) ALSO
  // returns just the larger piece for now — full split-into-N is deferred to a
  // later slice (see plan §Deferred). The dispatch arm emits
  // `feature.surface-trim.split-deferred` (warning) for the split op so this is
  // honest, not a silent stand-in for the promised compound.
  const keptSlab = areaA >= areaB ? pieceA : pieceB;

  // Extract the trimmed base face: the slab cap whose face coincides with the
  // original base face (distance ≈ 0). The opposite cap is offset by prismVec.
  const keptFace = extractBaseCap(oc, keptSlab, baseShape);
  if (!keptFace) {
    throw new Error('surfaceTrim: could not recover trimmed base face from split slab');
  }

  return { face: new replicad.Face(keptFace) };
}

/**
 * Among the faces of `slab`, return the one nearest (coincident with) the
 * original `baseShape` face — the trimmed copy of the base surface.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractBaseCap(oc: any, slab: any, baseShape: any): any | undefined {
  const exp = new oc.TopExp_Explorer_2(
    slab,
    oc.TopAbs_ShapeEnum.TopAbs_FACE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let best: any | undefined;
  let bestDist = Infinity;
  let bestArea = -Infinity;
  for (; exp.More(); exp.Next()) {
    const f = oc.TopoDS.Face_1(exp.Current());
    const dist = new oc.BRepExtrema_DistShapeShape_1();
    dist.LoadS1(baseShape);
    dist.LoadS2(f);
    dist.Perform(new oc.Message_ProgressRange_1());
    const d = dist.IsDone() ? dist.Value() : Infinity;
    const a = shapeArea(oc, f);
    dist.delete();
    // Coincident faces have d≈0; among those pick the largest (the base cap,
    // not a narrow side wall that may also graze the base edge).
    if (d < 1e-6) {
      if (a > bestArea) {
        bestArea = a;
        best = f;
        bestDist = d;
      }
    } else if (best === undefined && d < bestDist) {
      bestDist = d;
      best = f;
    }
  }
  return best;
}
