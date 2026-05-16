import type { Param, ScriptLocation, Vec3, FeatureId } from './types';

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
 * Capture-time record for a Surface. Parallel to `FeatureRecord` but lives
 * on `CaptureSession.surfaceRecords`. Carries enough data for the lowerer
 * to rebuild the surface from session state alone.
 */
export interface SurfaceRecord {
  id: SurfaceId;
  kind: 'nurbsSurface' | 'surfaceFromCurves';
  params: Record<string, Param>;
  data: NurbsSurfaceData | SurfaceFromCurvesData;
  scriptLocation?: ScriptLocation;
}
