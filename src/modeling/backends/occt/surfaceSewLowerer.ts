// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';

/** Options for `lowerSurfaceSew`. */
export interface LowerSurfaceSewOpts {
  /**
   * Stitching tolerance (mm). Adjacent edge pairs closer than this are merged
   * into a single shared edge. Passed straight to `BRepBuilderAPI_Sewing`.
   */
  tolerance: number;
  /**
   * When true, the caller asked for a watertight result. The lowerer does NOT
   * itself emit a diagnostic — it surfaces `isClosed`/`isSolid` so the dispatch
   * arm can decide whether to push `feature.surface-sew.open-shell`. The flag is
   * forwarded here only for documentation/symmetry; the closure facts are
   * computed unconditionally.
   */
  requireClosed?: boolean;
}

/** Result of `lowerSurfaceSew`. */
export interface SurfaceSewResult {
  /** The sewn geometry wrapped as an `OcctBackend` (solid if closed, else shell). */
  backend: OcctBackend;
  /**
   * True when the sewed result is a single closed shell that was successfully
   * promoted to a solid. False for open shells, compounds, or single faces.
   */
  isSolid: boolean;
  /**
   * True when the sewed shell is topologically closed (every edge shared by
   * two faces — no free boundary edges). Determined from the sewing's free-edge
   * count and confirmed by `BRepBuilderAPI_MakeSolid` producing a valid solid.
   */
  isClosed: boolean;
}

/**
 * Stitch N surface faces into a shell — and, when watertight, a solid — via
 * `BRepBuilderAPI_Sewing`. Direct OCCT (no replicad wrapper around the sewing
 * builder), with the final shape cast back to `replicad.Shape3D` so the
 * standard `OcctBackend` lineage (meshing, exporters, volume, history) keeps
 * working — the same tail idiom as `variableSweepLowerer` / `faceToShape`.
 *
 * Closure determination (two independent signals, both must agree for
 * `isClosed`):
 *  1. `BRepBuilderAPI_Sewing::NbFreeEdges() === 0` — no boundary edge belongs
 *     to only one face. This is the authoritative watertightness test on the
 *     sewn result itself.
 *  2. The sewed shape is a single `TopoDS_Shell` (type 3) that
 *     `BRepBuilderAPI_MakeSolid_3` promotes to a `BRepCheck_Analyzer`-valid
 *     solid. A failed MakeSolid (`IsDone() === false`) or an invalid solid
 *     means the shell, though it may have no free edges, is not a usable
 *     closed solid.
 *
 * `isSolid` is true only when signal (2) yields a valid solid; the returned
 * `backend` then wraps that solid. Otherwise the backend wraps the open shell
 * (or whatever the sewing produced) and `isSolid` is false.
 *
 * @throws {Error} If fewer than one face is supplied, or the sewing builder
 *   itself fails (OCCT exception). Callers (the dispatch arm) wrap and map
 *   into `feature.kernel-failed`.
 */
export function lowerSurfaceSew(
  faces: readonly replicad.Face[],
  opts: LowerSurfaceSewOpts,
): SurfaceSewResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;

  if (faces.length < 1) {
    throw new Error(`lowerSurfaceSew: need at least 1 face; got ${faces.length}.`);
  }

  // Args: tol, option(analysis)=true, cutting=true, nonManifold=false,
  // FaceMode=false. Mirrors the well-tuned config in OcctBackend.fromTriangleMesh
  // except nonManifold is false here — a surface shell should be manifold
  // (every edge shared by at most two faces). nonManifold:true would silently
  // accept T-junction stacks that are not a valid solid boundary.
  const sewing = new oc.BRepBuilderAPI_Sewing(opts.tolerance, true, true, false, false);

  for (const f of faces) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const faceTopo = (f as any).wrapped;
    sewing.Add(faceTopo);
  }

  sewing.Perform(new oc.Message_ProgressRange_1());
  const sewedShape = sewing.SewedShape();

  // Watertightness signal (1): no free (single-face) boundary edges.
  const nbFreeEdges: number = sewing.NbFreeEdges();
  const noFreeEdges = nbFreeEdges === 0;

  // Inspect the sewed shape type. TopAbs_ShapeEnum: COMPOUND=0, COMPSOLID=1,
  // SOLID=2, SHELL=3, FACE=4, WIRE=5, EDGE=6, VERTEX=7, SHAPE=8.
  const shapeTypeRaw = sewedShape.ShapeType();
  const shapeTypeVal =
    typeof shapeTypeRaw === 'object' && shapeTypeRaw !== null
      ? (shapeTypeRaw as { value?: number }).value ?? shapeTypeRaw
      : shapeTypeRaw;

  let isSolid = false;
  let solid: unknown;

  // Only a single closed shell can become a solid. If the sewing produced a
  // compound / single face / open multi-shell, skip the solid path.
  if (shapeTypeVal === 3 && noFreeEdges) {
    const shell = oc.TopoDS.Shell_1(sewedShape);
    const makeSolid = new oc.BRepBuilderAPI_MakeSolid_3(shell);
    if (makeSolid.IsDone()) {
      const candidate = makeSolid.Solid();
      // Confirm the promoted solid is geometrically valid (no inverted faces,
      // consistent orientation). GeomControls=false (topology-only is enough
      // for the closure question and far cheaper), parallel=false.
      const analyzer = new oc.BRepCheck_Analyzer(candidate, false, false);
      if (analyzer.IsValid_2()) {
        isSolid = true;
        solid = candidate;
      }
      analyzer.delete?.();
    }
    makeSolid.delete?.();
  }

  sewing.delete?.();

  // A result is "closed" when it has no free edges AND it formed a valid solid.
  // (No free edges alone can be true for a non-manifold or mis-oriented shell
  // that MakeSolid rejects; we require both so isClosed never over-promises.)
  const isClosed = noFreeEdges && isSolid;

  const rawShape = isSolid ? solid : sewedShape;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = replicad.cast(rawShape as any) as replicad.Shape3D;
  return { backend: new OcctBackend(wrapped), isSolid, isClosed };
}
