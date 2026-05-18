import { getOC } from 'replicad';
import * as replicad from 'replicad';
import { lowerCurve3D } from './curve3dLowerer';
import type { Curve3DMetadata } from '../../../shared/intent/curve3dRecord';
import type { CoonsPatchData } from '../../../shared/intent/surfaceRecord';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { ShapeBackend } from '../../../kernel/backends/backend';

/**
 * Result of lowering a Coons-patch surface record to OCCT.
 *
 * The face is a single `TopoDS_Face` produced by
 * `BRepOffsetAPI_MakeFilling` (see 2026-05-18 audit at
 * `docs/audit/2026-05-18-slice-c-occt-symbols.md` — the plan's
 * `BRepFill_Filling` name is not exposed in this bundle; the
 * `BRepOffsetAPI_MakeFilling` class is the same algorithm under a
 * different name and supports the full constraint set we need).
 */
export interface CoonsPatchLowerResult {
  /** Replicad-wrapped `TopoDS_Face`, ready to feed into `thickenFace` /
   *  `faceToShape` exactly like a `buildNurbsFace` result. */
  face: replicad.Face;
}

/** Map a capture-time continuity grade to OCCT's `GeomAbs_Shape` enum. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function geomAbsFor(oc: any, c: 'C0' | 'C1' | 'C2'): unknown {
  if (c === 'C2') return oc.GeomAbs_Shape.GeomAbs_C2;
  if (c === 'C1') return oc.GeomAbs_Shape.GeomAbs_C1;
  return oc.GeomAbs_Shape.GeomAbs_C0;
}

/**
 * Build a Coons-patch face from a captured `CoonsPatchData` surface record.
 *
 * Direct OCCT call sequence (see audit doc — `Add_1` is the boundary-edge
 * variant; `Add_2..Add_5` exist but are reserved for tangency-to-neighbour
 * follow-ups):
 *
 *  1. Construct `BRepOffsetAPI_MakeFilling(Degree=3, NbPtsOnCur=15, NbIter=2,
 *     Anisotropie=false, Tol2d=1e-5, Tol3d=1e-4, TolAng=1e-2, TolCurv=1e-3,
 *     MaxDeg=8, MaxSegments=9000)` — defaults track the plan's parameters.
 *     `sampling` overrides `NbPtsOnCur` when provided.
 *  2. For each of the 4 boundary curves: look up the upstream `curve3d`
 *     FeatureRecord in `session`. Prefer the parked edge on
 *     `session.importedGeometry` (the engine-driven path through the main
 *     lowerer parks it there) and fall back to lowering the curve metadata
 *     here. Add the resulting `TopoDS_Edge` to the filling via
 *     `Add_1(edge, geomAbs(continuity[i]), true)` (IsBound=true).
 *  3. `Build(new Message_ProgressRange_1())`. If `IsDone()` is false, throw
 *     so the caller can attach `feature.surface-from-boundary.degenerate-patch`.
 *  4. Downcast `.Shape()` to `TopoDS_Face` via `oc.TopoDS.Face_1(shape)` and
 *     wrap in `new replicad.Face(...)` so the result flows through
 *     `thickenFace` / `faceToShape` identically to a `buildNurbsFace`
 *     result. The audit confirms `filling.Face()` is NOT exposed — the
 *     downcast is mandatory.
 */
export function lowerCoonsPatch(
  data: CoonsPatchData,
  allRecords: readonly FeatureRecord[],
  importedGeometry: Map<string, ShapeBackend>,
): CoonsPatchLowerResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;

  const sampling = data.sampling ?? 15;
  const filling = new oc.BRepOffsetAPI_MakeFilling(
    3,         // Degree — internal surface degree.
    sampling,  // NbPtsOnCur — sampling density per boundary curve.
    2,         // NbIter
    false,     // Anisotropie
    1e-5,      // Tol2d
    1e-4,      // Tol3d
    1e-2,      // TolAng (radians)
    1e-3,      // TolCurv
    8,         // MaxDeg
    9000,      // MaxSegments
  );

  for (let i = 0; i < 4; i++) {
    const curveId = data.curveIds[i];

    // 1. Reuse the parked edge if the main lowerer already visited the
    //    upstream curve3d record.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let edge: any = importedGeometry.get(curveId);

    // 2. Otherwise lower the curve3d metadata on demand. curve3d records are
    //    virtual, so the recompute engine skips their lowering — we
    //    materialise the edge here exactly the way `variableSweep` does.
    if (!edge) {
      const upstream = allRecords.find((r) => r.id === curveId);
      if (!upstream || upstream.kind !== 'curve3d') {
        throw new Error(
          `Coons patch boundary curve '${curveId}' is not a curve3d record on the session.`,
        );
      }
      const cmeta = (upstream.metadata as { curve3d?: unknown } | undefined)?.curve3d;
      if (!cmeta) {
        throw new Error(
          `Coons patch boundary curve '${curveId}' is missing metadata.curve3d.`,
        );
      }
      edge = lowerCurve3D(cmeta as Curve3DMetadata).edge;
      // Park for downstream consumers (a follow-up surfaceFromBoundary
      // referencing the same curve will reuse the cached edge).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      importedGeometry.set(curveId, edge as any);
    }

    filling.Add_1(edge, geomAbsFor(oc, data.continuity[i]), true);
  }

  filling.Build(new oc.Message_ProgressRange_1());
  if (!filling.IsDone()) {
    throw new Error('BRepOffsetAPI_MakeFilling.IsDone() returned false');
  }

  const shape = filling.Shape();
  const topoFace = oc.TopoDS.Face_1(shape);
  return { face: new replicad.Face(topoFace) };
}
