// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingProjection.ts
//
// Hidden-line-removal projection for the engineering-drawing exporter.
// Runs OCCT's HLRBRep_Algo on a (possibly compound) shape and returns the
// projected edges as 2D polylines, classified by line role:
//
//   - sharp:   true geometric edges (C0 face boundaries) — full weight.
//   - outline: smooth-silhouette contours (e.g. the side of a cylinder seen
//              from the front) — full weight.
//   - smooth:  tangent edges (C1 face transitions, e.g. fillet boundaries) —
//              drawn thin so they don't read as physical corners.
//
// Each role exists for both the visible and the hidden pass. Keeping the
// three HLR output compounds separate (instead of merging them into one
// "visible" bucket) is what lets the sheet renderer style tangent edges
// thin per drafting convention.
//
// Output coordinates live in the projection-camera frame: x along the
// camera's XDirection, y along its YDirection (up), depth dropped. The
// caller maps these into sheet coordinates.

import {
  getOC,
  GCWithScope,
  cast,
  ProjectionCamera,
  type AnyShape,
} from 'replicad';
import type { Polyline2, Pt2, DrawingViewName } from './drawingLayout';

/** Raw OCCT shape handle (TopoDS_Shape), named via `cast`'s signature so we
 *  don't depend on the wasm package's type-export shape. */
type OcctShapeHandle = Parameters<typeof cast>[0];

export interface ProjectedViewEdges {
  visibleSharp: Polyline2[];
  visibleOutline: Polyline2[];
  visibleSmooth: Polyline2[];
  hiddenSharp: Polyline2[];
  hiddenOutline: Polyline2[];
  hiddenSmooth: Polyline2[];
}

/**
 * Standard drawing cameras (model space: mm, z-up, right-handed; the model's
 * front faces −y). `direction` points from the object toward the viewer,
 * `xAxis` is the view's screen-right in model space; screen-up follows as
 * direction × xAxis:
 *
 *   - front: viewer at −y → x=+X, up=+Z.
 *   - top:   viewer at +z → x=+X, up=+Y (third-angle: the object's front
 *            edge lands at the bottom of the top view, adjacent to front).
 *   - left:  viewer at −x → x=−Y, up=+Z (third-angle: the object's front
 *            edge lands at the right of the left view, adjacent to front).
 *   - iso:   pictorial from the upper front-left octant.
 */
type V3 = [number, number, number];

/** Camera definitions, single-sourced so `makeDrawingCamera` (which drives the
 *  HLR pass) and `viewBasis` (which drives annotation anchoring) can never
 *  disagree — an annotation projected through a different basis than the
 *  geometry would silently float off its feature. */
const VIEW_CAMERAS: Record<DrawingViewName, { direction: V3; xAxis: V3 }> = {
  front: { direction: [0, -1, 0], xAxis: [1, 0, 0] },
  top: { direction: [0, 0, 1], xAxis: [1, 0, 0] },
  left: { direction: [-1, 0, 0], xAxis: [0, -1, 0] },
  iso: {
    direction: [-1 / Math.sqrt(3), -1 / Math.sqrt(3), 1 / Math.sqrt(3)],
    xAxis: [1 / Math.sqrt(2), -1 / Math.sqrt(2), 0],
  },
};

export function makeDrawingCamera(view: DrawingViewName): ProjectionCamera {
  const c = VIEW_CAMERAS[view];
  return new ProjectionCamera([0, 0, 0], c.direction, c.xAxis);
}

/**
 * Camera for an auxiliary view looking along an arbitrary direction (oblique
 * section cells). `direction` points from the object toward the viewer and
 * `xAxis` is screen-right; both must be unit length and orthogonal. Screen-up
 * follows as `direction × xAxis`, the same convention as the standard views,
 * so `[p·xAxis, p·(direction × xAxis)]` is the model-2D frame HLR emits.
 */
export function makeAuxiliaryCamera(
  direction: readonly [number, number, number],
  xAxis: readonly [number, number, number],
): ProjectionCamera {
  return new ProjectionCamera([0, 0, 0], [direction[0], direction[1], direction[2]], [xAxis[0], xAxis[1], xAxis[2]]);
}

const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return l > 0 ? [v[0] / l, v[1] / l, v[2] / l] : v;
};

/**
 * Orthonormal screen basis of a drawing view in model space: `x` is screen
 * right, `y` is screen up. A model point's model-2D coordinate — the same
 * frame HLR emits — is `[p·x, p·y]`.
 *
 * Screen-up is `direction × xAxis`, matching OCCT's projector convention;
 * the resulting axes are exactly the ones documented on `makeDrawingCamera`
 * (front → +X/+Z, top → +X/+Y, left → −Y/+Z).
 */
export function viewBasis(view: DrawingViewName): { x: V3; y: V3 } {
  const c = VIEW_CAMERAS[view];
  return { x: norm(c.xAxis), y: norm(cross(c.direction, c.xAxis)) };
}

/** Project a model-space point into the view's model-2D frame (y up). */
export function projectPointForDrawing(
  p: readonly [number, number, number],
  view: DrawingViewName,
): Pt2 {
  const b = viewBasis(view);
  return [
    p[0] * b.x[0] + p[1] * b.x[1] + p[2] * b.x[2],
    p[0] * b.y[0] + p[1] * b.y[1] + p[2] * b.y[2],
  ];
}

export interface ProjectionOptions {
  /** Compute the hidden-line pass (default true). Pictorials skip it. */
  withHidden?: boolean;
  /** Chord deflection (mm, model space) when discretizing curved projected
   *  edges. Default 0.02 — invisible at print scale, deterministic. */
  curveTolerance?: number;
  /** Angular deflection (radians) for the same discretization. */
  angularTolerance?: number;
}

/**
 * Above this many faces a drawing source is projected with polygonal hidden-
 * line removal (HLRBRep_PolyAlgo, on a triangulation) instead of exact
 * HLRBRep_Algo. Exact HLR on the SO-100 arm's 65k STL facets took 54 s and
 * 1.5 GB of WASM heap for one view and ran out of memory on the second; the
 * 2,556-face planetary gear stage projects exactly in ~10 s for four views.
 */
export const POLY_HLR_MIN_FACES = 20_000;

/** Facet edges whose faces meet at less than this are smooth seams, not
 *  creases (the usual mesh auto-smooth angle). Polygonal mode only. */
const POLY_CREASE_ANGLE_RAD = (30 * Math.PI) / 180;

/** A drawing source ready for repeated projection (one per view). */
export interface PreparedDrawingSource {
  /** 'exact' (HLRBRep_Algo) or 'polygonal' (HLRBRep_PolyAlgo). */
  readonly mode: 'exact' | 'polygonal';
  project(camera: ProjectionCamera, options?: ProjectionOptions): ProjectedViewEdges;
  /** Frees the polygonal working copy; a no-op in exact mode. */
  dispose(): void;
}

/**
 * Project `shape` through the camera with hidden-line removal and return
 * the classified 2D polylines. Compound shapes (multi-part assemblies in
 * world frame) are handled by OCCT directly, so inter-part occlusion is
 * respected. To project one shape through several cameras, prepare it once
 * with `prepareShapeForDrawing`.
 */
export function projectShapeForDrawing(
  shape: AnyShape,
  camera: ProjectionCamera,
  options: ProjectionOptions = {},
): ProjectedViewEdges {
  const source = prepareShapeForDrawing(shape);
  try {
    return source.project(camera, options);
  } finally {
    source.dispose();
  }
}

/**
 * Prepare `shape` for projection. Shapes up to `POLY_HLR_MIN_FACES` faces
 * (or any shape, when the WASM build lacks HLRBRep_PolyAlgo) use exact HLR
 * on the shape itself. Larger ones get a private working copy: each
 * shape is deep-copied, its facet edges under the crease angle marked
 * regular (BRepLib::EncodeRegularity, which would otherwise change the
 * caller's model), and meshed shell by shell (whole-compound BRepMesh aborts
 * on dense imports). In that mode the smooth classes are those facet seams,
 * so they come back empty; sharp and outline lines are kept.
 */
export function prepareShapeForDrawing(
  shape: AnyShape,
  options: { polygonalMinFaces?: number } = {},
): PreparedDrawingSource {
  const oc = getOC();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ocAny = oc as any;
  if (typeof ocAny.HLRBRep_PolyAlgo_1 !== 'function' || !hasMoreFacesThan(ocAny, shape.wrapped, options.polygonalMinFaces ?? POLY_HLR_MIN_FACES)) {
    return { mode: 'exact', project: (camera, options) => projectExact(shape, camera, options), dispose: () => {} };
  }
  const working = polygonalWorkingCopy(ocAny, shape.wrapped);
  return {
    mode: 'polygonal',
    project: (camera, options) => projectPolygonal(working, camera, options),
    dispose: () => working.delete(),
  };
}

function hasMoreFacesThan(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  shape: unknown,
  limit: number,
): boolean {
  const faces = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  try {
    let n = 0;
    for (; faces.More(); faces.Next()) if (++n > limit) return true;
    return false;
  } finally {
    faces.delete();
  }
}

/** A deep copy of `shape` with facet regularity encoded and a triangulation,
 *  for HLRBRep_PolyAlgo. */
function polygonalWorkingCopy(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  shape: unknown,
): { delete(): void } {
  const identity = new oc.gp_Trsf_1();
  const transform = new oc.BRepBuilderAPI_Transform_2(shape, identity, true);
  const copy = transform.Shape();
  transform.delete();
  identity.delete();
  oc.BRepLib.EncodeRegularity_1(copy, POLY_CREASE_ANGLE_RAD);
  // Mesh shell by shell, then any free faces: one BRepMesh over a dense
  // multi-part compound aborts (see backendMesh.ts).
  const { TopAbs_SHELL, TopAbs_FACE, TopAbs_SHAPE } = oc.TopAbs_ShapeEnum;
  forEachSubShape(oc, copy, TopAbs_SHELL, TopAbs_SHAPE, (shell) => meshForDrawing(oc, shell));
  forEachSubShape(oc, copy, TopAbs_FACE, TopAbs_SHELL, (face) => meshForDrawing(oc, face));
  return copy;
}

function forEachSubShape(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  shape: unknown,
  type: unknown,
  avoid: unknown,
  fn: (sub: unknown) => void,
): void {
  const explorer = new oc.TopExp_Explorer_2(shape, type, avoid);
  try {
    for (; explorer.More(); explorer.Next()) {
      const sub = explorer.Current();
      try {
        fn(sub);
      } finally {
        sub.delete();
      }
    }
  } finally {
    explorer.delete();
  }
}

/** Triangulate at ~0.1% of the shape's size (under a pen width at drawing
 *  scale). A shape OCCT cannot mesh is left out of the polygonal views. */
function meshForDrawing(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  shape: unknown,
): void {
  const box = new oc.Bnd_Box_1();
  try {
    oc.BRepBndLib.Add(shape, box, false);
    const diagonal = box.IsVoid() ? 1 : Math.sqrt(box.SquareExtent());
    new oc.BRepMesh_IncrementalMesh_2(shape, Math.max(0.02, diagonal * 1e-3), false, 0.5, false).delete();
  } catch {
    // Left untriangulated: PolyAlgo skips faces without a triangulation.
  } finally {
    box.delete();
  }
}

/** Discretize every edge of one HLR output compound into 2D polylines. */
function discretize(
  compound: OcctShapeHandle,
  r: ReturnType<typeof GCWithScope>,
  curveTol: number,
  angTol: number,
): Polyline2[] {
  const oc = getOC();
  if (compound.IsNull()) return [];
  const polylines: Polyline2[] = [];
  for (const edge of cast(compound).edges) {
    r(edge);
    // HLR output edges carry only 2D curve records until rebuilt.
    oc.BRepLib.BuildCurves3d_2(edge.wrapped);
    const adaptor = r(new oc.BRepAdaptor_Curve_2(edge.wrapped));
    const sampler = r(new oc.GCPnts_TangentialDeflection_2(adaptor, angTol, curveTol, 2, 1e-9, 1e-7));
    const n = sampler.NbPoints();
    if (n < 2) continue;
    const pl: Array<readonly [number, number]> = [];
    for (let i = 1; i <= n; i++) {
      const p = sampler.Value(i);
      pl.push([p.X(), p.Y()]);
      p.delete();
    }
    polylines.push(pl);
  }
  return polylines;
}

function projectPolygonal(
  working: unknown,
  camera: ProjectionCamera,
  options: ProjectionOptions = {},
): ProjectedViewEdges {
  const withHidden = options.withHidden !== false;
  const curveTol = options.curveTolerance ?? 0.02;
  const angTol = options.angularTolerance ?? 0.08;
  const oc = getOC();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ocAny = oc as any;
  const r = GCWithScope();
  // The handle owns the reference-counted algorithm; only the handle is freed.
  const algo = new ocAny.HLRBRep_PolyAlgo_1();
  const handle = r(new ocAny.Handle_HLRBRep_PolyAlgo_2(algo));
  algo.Load(working);
  const projector = r(new oc.HLRAlgo_Projector_2(camera.wrapped));
  algo.Projector_2(projector);
  algo.Update();
  const toShape = r(new ocAny.HLRBRep_PolyHLRToShape());
  toShape.Update(handle);
  const grab = (compound: OcctShapeHandle): Polyline2[] => discretize(r(compound), r, curveTol, angTol);
  return {
    visibleSharp: grab(toShape.VCompound_1()),
    visibleOutline: grab(toShape.OutLineVCompound_1()),
    visibleSmooth: [],
    hiddenSharp: withHidden ? grab(toShape.HCompound_1()) : [],
    hiddenOutline: withHidden ? grab(toShape.OutLineHCompound_1()) : [],
    hiddenSmooth: [],
  };
}

function projectExact(
  shape: AnyShape,
  camera: ProjectionCamera,
  options: ProjectionOptions = {},
): ProjectedViewEdges {
  const withHidden = options.withHidden !== false;
  const curveTol = options.curveTolerance ?? 0.02;
  const angTol = options.angularTolerance ?? 0.08;

  const oc = getOC();
  const r = GCWithScope();

  // The OCCT handle owns this reference-counted algorithm. Registering both
  // the raw algorithm and its handle for deletion frees it twice when GC runs.
  const algo = new oc.HLRBRep_Algo_1();
  const algoHandle = r(new oc.Handle_HLRBRep_Algo_2(algo));
  algo.Add_2(shape.wrapped, 0);
  const projector = r(new oc.HLRAlgo_Projector_2(camera.wrapped));
  algo.Projector_1(projector);
  algo.Update();
  algo.Hide_1();
  const hlrToShape = r(
    new oc.HLRBRep_HLRToShape(algoHandle),
  );
  const grab = (compound: OcctShapeHandle): Polyline2[] => discretize(compound, r, curveTol, angTol);

  return {
    visibleSharp: grab(r(hlrToShape.VCompound_1())),
    visibleOutline: grab(r(hlrToShape.OutLineVCompound_1())),
    visibleSmooth: grab(r(hlrToShape.Rg1LineVCompound_1())),
    hiddenSharp: withHidden ? grab(r(hlrToShape.HCompound_1())) : [],
    hiddenOutline: withHidden ? grab(r(hlrToShape.OutLineHCompound_1())) : [],
    hiddenSmooth: withHidden ? grab(r(hlrToShape.Rg1LineHCompound_1())) : [],
  };
}
