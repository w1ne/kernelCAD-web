// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Param, ScriptLocation, Vec3, FeatureId, FeatureRef } from './types';

/**
 * Stable per-session identifier for a captured NURBS surface. Parallel to
 * `FeatureId` but minted by a separate counter so the two id streams cannot
 * collide (surface_1 vs box_1 etc.). Surfaces never enter `FeatureRecord` —
 * they live in their own `SurfaceRecord` list on the `CaptureSession`.
 */
export type SurfaceId = string;

/**
 * Data payload for a `nurbsSurface(...)` call captured in the session. The
 * lowerer reads this directly via `CaptureSession.getSurfaceRecord(id)`
 * before resolving the per-record `surface` FeatureRef into a Replicad
 * `Face` cached on the OcctLowerer.
 *
 * Slice-1 limitation: weights are accepted for forward compatibility but
 * silently degraded to non-rational at lower time (the underlying
 * `TColStd_Array2OfReal` class is not exposed in the replicad-opencascadejs
 * bindings). See `src/backends/occt/nurbsSurfaceLowerer.ts` deviation #3.
 */
export interface NurbsSurfaceData {
  kind: 'nurbsSurface';
  controls: Vec3[][];
  weights?: number[][];
  degree: { u: number; v: number };
  knots?: { u: number[]; v: number[] };
  periodic?: { u: boolean; v: boolean };
}

/**
 * Data payload for `surfaceFromCurves(sections)`. Sections are referenced
 * by the underlying FeatureId of each `Sketch` so the lowerer can pull the
 * lifted face wires from the session's record list at lower time.
 */
export interface SurfaceFromCurvesData {
  kind: 'surfaceFromCurves';
  sectionIds: FeatureId[];
}

/**
 * Data payload for `surfaceFromBoundary([c1, c2, c3, c4])` — a Coons patch
 * filling the interior of 4 boundary curves. Lowers to OCCT's
 * `BRepOffsetAPI_MakeFilling` (audited 2026-05-18; the plan's
 * `BRepFill_Filling` name is not exposed in this bundle, but
 * `BRepOffsetAPI_MakeFilling` is the same algorithm under a different name).
 *
 * `curveIds[0]` = bottom, `curveIds[1]` = right, `curveIds[2]` = top,
 * `curveIds[3]` = left. The capture-time corner-coincidence check requires
 * `curve[i].end ≈ curve[(i+1)%4].start` within 1e-6 mm.
 */
export interface CoonsPatchData {
  kind: 'coonsPatch';
  curveIds: [FeatureId, FeatureId, FeatureId, FeatureId];
  /** Per-edge continuity flag, in the same order as `curveIds`. Maps to
   *  `GeomAbs_C0 | GeomAbs_C1 | GeomAbs_C2` at lower time. */
  continuity: ['C0' | 'C1' | 'C2', 'C0' | 'C1' | 'C2', 'C0' | 'C1' | 'C2', 'C0' | 'C1' | 'C2'];
  /** Sampling density per boundary curve (NbPtsOnCur on
   *  `BRepOffsetAPI_MakeFilling`). Defaults to 15 when absent. */
  sampling?: number;
}

/**
 * Data payload for `surface.trimTo(by)` / `surface.split(by)`. Produced at
 * capture time only — no geometry is computed here. The lowerer (Task 3) reads
 * `surfaceId`, resolves the cutter via `byRef`, runs OCCT BRepAlgoAPI_Section,
 * and returns the trimmed/split result. `op: 'trim'` keeps the portion chosen
 * by the keep-side heuristic (the larger surviving piece).
 *
 * `op: 'split'` currently returns ONLY the larger piece too — identical to
 * `trim` — and emits a `feature.surface-trim.split-deferred` warning. Full
 * split-into-both-halves (a compound of both sides) is deferred to a later
 * slice; the lowerer does not fabricate a compound today.
 */
export interface SurfaceTrimData {
  surfaceId: SurfaceId;
  byRef: { surfaceId: SurfaceId } | { featureRef: FeatureRef };
  op: 'trim' | 'split';
}

/**
 * Capture-time record for a Surface. Parallel to `FeatureRecord` but lives
 * on `CaptureSession.surfaceRecords`. Carries enough data for the lowerer
 * to rebuild the surface from session state alone.
 */
export interface SurfaceRecord {
  id: SurfaceId;
  kind: 'nurbsSurface' | 'surfaceFromCurves' | 'coonsPatch' | 'surfaceTrim';
  params: Record<string, Param>;
  data: NurbsSurfaceData | SurfaceFromCurvesData | CoonsPatchData | SurfaceTrimData;
  scriptLocation?: ScriptLocation;
  /** Optional structured diagnostics from capture-time validation. */
  diagnostics?: import('../diagnostics/diagnostic').CompilerDiagnostic[];
}
