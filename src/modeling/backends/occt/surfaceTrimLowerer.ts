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
  op: 'trim' | 'split',
): SurfaceTrimLowerResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const baseShape = unwrap(baseFace);
  const cutterShape = unwrap(cutter);

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
  const common = new oc.BRepAlgoAPI_Common_3(slab, wall, new oc.Message_ProgressRange_1());
  common.Build(new oc.Message_ProgressRange_1());
  const pieceA = common.Shape();

  const cut = new oc.BRepAlgoAPI_Cut_3(slab, wall, new oc.Message_ProgressRange_1());
  cut.Build(new oc.Message_ProgressRange_1());
  const pieceB = cut.Shape();

  const areaA = shapeArea(oc, pieceA);
  const areaB = shapeArea(oc, pieceB);

  // 'trim' keeps the larger surviving piece; 'split' (single-face form) returns
  // the larger piece too for now (split-into-N is deferred — see plan §Deferred).
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
