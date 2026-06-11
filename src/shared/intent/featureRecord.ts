// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type {
  CanonicalFace, FeatureId, FeatureKind, FeatureRef, Param, PlaneSpec, ScriptLocation, Vec3Param,
} from './types';
// Re-export so consumers can import CanonicalFace from the same module as FaceLabelsMap.
export type { CanonicalFace };
import type { FaceQuery } from './queryTypes';
import type { PBRMaterial } from './material';
import type { Curve3DMetadata } from './curve3dRecord';
import type { VariableSweepMetadata } from './variableSweepRecord';
import type { FilletContinuity } from './filletContinuityRecord';

export type ShapeTransform =
  | { op: 'translate'; vec: Vec3Param }
  | { op: 'rotateAxis'; axis: Vec3Param; degrees: Param; pivot?: Vec3Param }
  | { op: 'scale'; sx: number; sy: number; sz: number }
  | { op: 'reflect'; plane: PlaneSpec };

/** Map of user-chosen label → resolution target. Stored under
 *  FeatureRecord.metadata.faceLabels for kinds that accept it (box, cylinder,
 *  extrude, revolve, sweep, loft). Sphere rejects this key at capture time. */
export type FaceLabelsMap = Record<string, CanonicalFace | FaceQuery>;

export interface FeatureMetadata {
  /** Hex color or CSS color string applied to this feature's mesh. */
  color?: string;
  /** Face-label map for features that support canonical-face naming. */
  faceLabels?: FaceLabelsMap;
  /** PBR material applied by `Shape.material()`. Identity dies at booleans. */
  material?: PBRMaterial;
  /** Per-face PBR materials keyed by face-label name. Populated by
   *  `Shape.material({ face: '<label>', ... })`. Labels must resolve against
   *  an upstream `metadata.faceLabels` entry (same machinery as edge/face
   *  selection); see `src/modeling/capture/featureMeshing.ts` for resolution.
   *  Sibling to `material` — the whole-shape default applies to unmatched
   *  faces; identity dies at booleans (same as `material` and `color`). */
  materialByLabel?: Record<string, PBRMaterial>;
  /** true for capture-graph nodes that produce no OcctBackend geometry
   *  (referenceImage today; future construction-only feature kinds may set this). */
  virtual?: boolean;
  /** NURBS Slice B: control-net spec for a `curve3d` feature. Read by the
   *  Curve3D lowerer to build a `Geom_BSplineCurve`. */
  curve3d?: Curve3DMetadata;
  /** NURBS Slice B: multi-section sweep spec consumed by the variableSweep
   *  lowerer (BRepOffsetAPI_MakePipeShell). */
  variableSweep?: VariableSweepMetadata;
  /** NURBS Slice C Task 6: continuity grade on `Shape.fillet`. Default `'G1'`
   *  (existing OCCT behaviour); `'G2'` selects a curvature-continuous blend
   *  via `BRepFilletAPI_MakeFillet.SetContinuity(GeomAbs_G2, 1e-4)`. Stored
   *  on the fillet `FeatureRecord` and read by the OCCT lowerer. */
  continuity?: FilletContinuity;
  /**
   * Catch-all for feature-kind-specific keys (commands, poses, partIds,
   * bendRecord, etc.) accessed via cast in individual lowerers. Promote a
   * key to a typed field above when it is read by >2 modules or when its
   * shape becomes part of a public API contract.
   *
   * Trade-off: this swallows typos at the call site (`metadata.materail`
   * would compile and return `unknown`). New typed fields above catch them.
   */
  [key: string]: unknown;
}

export interface FeatureRecord {
  id: FeatureId;
  kind: FeatureKind;
  inputs: Record<string, FeatureRef>;
  params: Record<string, Param>;
  transforms: ShapeTransform[];
  scriptLocation?: ScriptLocation;
  suppressed: boolean;
  metadata?: FeatureMetadata;
}
