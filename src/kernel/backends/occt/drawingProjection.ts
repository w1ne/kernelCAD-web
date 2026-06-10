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
import type { Polyline2, DrawingViewName } from './drawingLayout';

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
export function makeDrawingCamera(view: DrawingViewName): ProjectionCamera {
  switch (view) {
    case 'front':
      return new ProjectionCamera([0, 0, 0], [0, -1, 0], [1, 0, 0]);
    case 'top':
      return new ProjectionCamera([0, 0, 0], [0, 0, 1], [1, 0, 0]);
    case 'left':
      return new ProjectionCamera([0, 0, 0], [-1, 0, 0], [0, -1, 0]);
    case 'iso': {
      const k = 1 / Math.sqrt(3);
      const h = 1 / Math.sqrt(2);
      return new ProjectionCamera([0, 0, 0], [-k, -k, k], [h, -h, 0]);
    }
  }
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
 * Project `shape` through the camera with hidden-line removal and return
 * the classified 2D polylines. Compound shapes (multi-part assemblies in
 * world frame) are handled by OCCT directly, so inter-part occlusion is
 * respected.
 */
export function projectShapeForDrawing(
  shape: AnyShape,
  camera: ProjectionCamera,
  options: ProjectionOptions = {},
): ProjectedViewEdges {
  const withHidden = options.withHidden !== false;
  const curveTol = options.curveTolerance ?? 0.02;
  const angTol = options.angularTolerance ?? 0.08;

  const oc = getOC();
  const r = GCWithScope();

  const algo = r(new oc.HLRBRep_Algo_1());
  algo.Add_2(shape.wrapped, 0);
  const projector = r(new oc.HLRAlgo_Projector_2(camera.wrapped));
  algo.Projector_1(projector);
  algo.Update();
  algo.Hide_1();
  const hlrToShape = r(
    new oc.HLRBRep_HLRToShape(r(new oc.Handle_HLRBRep_Algo_2(algo))),
  );

  // Discretize every edge of one HLR output compound into 2D polylines.
  const grab = (compound: OcctShapeHandle): Polyline2[] => {
    if (compound.IsNull()) return [];
    const polylines: Polyline2[] = [];
    for (const edge of cast(compound).edges) {
      r(edge);
      // HLR output edges carry only 2D curve records until rebuilt.
      oc.BRepLib.BuildCurves3d_2(edge.wrapped);
      const adaptor = r(new oc.BRepAdaptor_Curve_2(edge.wrapped));
      const sampler = r(
        new oc.GCPnts_TangentialDeflection_2(
          adaptor, angTol, curveTol, 2, 1e-9, 1e-7,
        ),
      );
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
  };

  return {
    visibleSharp: grab(r(hlrToShape.VCompound_1())),
    visibleOutline: grab(r(hlrToShape.OutLineVCompound_1())),
    visibleSmooth: grab(r(hlrToShape.Rg1LineVCompound_1())),
    hiddenSharp: withHidden ? grab(r(hlrToShape.HCompound_1())) : [],
    hiddenOutline: withHidden ? grab(r(hlrToShape.OutLineHCompound_1())) : [],
    hiddenSmooth: withHidden ? grab(r(hlrToShape.Rg1LineHCompound_1())) : [],
  };
}
