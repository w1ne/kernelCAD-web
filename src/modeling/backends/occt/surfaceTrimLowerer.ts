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

/** Thrown by `lowerSurfaceTrim` when a base/cutter patch is not near-planar.
 *  The dispatch arm pattern-matches this to emit
 *  `feature.surface-trim.non-planar` (return base unchanged + diagnostic). */
export class NonPlanarTrimError extends Error {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectSectionEdges(oc: any, baseShape: any, cutterShape: any): any[] {
  const section = new oc.BRepAlgoAPI_Section_3(baseShape, cutterShape, false);
  try {
    section.ComputePCurveOn1(true);
    section.Approximation(true);
    section.Build(new oc.Message_ProgressRange_1());
    if (!section.IsDone()) {
      throw new Error('surfaceTrim: BRepAlgoAPI_Section failed to build');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const edges: any[] = [];
    const sectionShape = section.Shape();
    const exp = new oc.TopExp_Explorer_2(
      sectionShape,
      oc.TopAbs_ShapeEnum.TopAbs_EDGE,
      oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
    );
    try {
      for (; exp.More(); exp.Next()) {
        edges.push(oc.TopoDS.Edge_1(exp.Current()));
      }
    } finally {
      exp.delete();
    }
    return edges;
  } finally {
    section.delete();
  }
}

/**
 * Lower a `surfaceTrim` record: cut `baseFace` against `cutter` and return the
 * trimmed face.
 *
 * Slice F uses the real OCCT imprint path: section base/cutter, add the
 * section edges to `BRepFeat_SplitShape(baseFace)`, then select the resulting
 * face pieces. This handles curved patches without the Slice-E average-normal
 * slab approximation.
 *
 * Well-conditioned (clean axis-aligned crossing) input only; OCCT Section is
 * fragile on degenerate/tangent input.
 */
export function lowerSurfaceTrim(
  baseFace: replicad.Face,
  cutter: replicad.Face,
  op: 'trim' | 'split',
  piece: 0 | 1 = 0,
): SurfaceTrimLowerResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const baseShape = unwrap(baseFace);
  const cutterShape = unwrap(cutter);

  const edges = collectSectionEdges(oc, baseShape, cutterShape);
  if (edges.length === 0) {
    throw new Error('surfaceTrim: no section curve — surfaces do not intersect');
  }

  const splitter = new oc.BRepFeat_SplitShape_2(baseShape);
  try {
    splitter.SetCheckInterior(true);
    for (const edge of edges) {
      splitter.Add_3(edge, baseShape);
    }
    splitter.Build(new oc.Message_ProgressRange_1());
    if (!splitter.IsDone()) {
      throw new Error('surfaceTrim: BRepFeat_SplitShape failed to build');
    }

    const faces = extractFaces(oc, splitter.Shape())
      .map((faceShape) => ({ faceShape, area: shapeArea(oc, faceShape) }))
      .filter((f) => f.area > 1e-8)
      .sort((a, b) => b.area - a.area);

    if (faces.length < 2 && op === 'split') {
      throw new Error(`surfaceTrim: split produced ${faces.length} valid face piece(s), expected at least 2`);
    }
    if (faces.length === 0) {
      throw new Error('surfaceTrim: split produced no valid face pieces');
    }

    const index = op === 'split' ? piece : 0;
    const selected = faces[index];
    if (!selected) {
      throw new Error(`surfaceTrim: requested split piece ${index}, but only ${faces.length} piece(s) were produced`);
    }
    return { face: new replicad.Face(selected.faceShape) };
  } finally {
    splitter.delete();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFaces(oc: any, shape: any): any[] {
  const exp = new oc.TopExp_Explorer_2(
    shape,
    oc.TopAbs_ShapeEnum.TopAbs_FACE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faces: any[] = [];
  try {
    for (; exp.More(); exp.Next()) {
      faces.push(oc.TopoDS.Face_1(exp.Current()));
    }
  } finally {
    exp.delete();
  }
  return faces;
}
