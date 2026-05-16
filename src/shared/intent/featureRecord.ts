import type {
  CanonicalFace, FeatureId, FeatureKind, FeatureRef, Param, PlaneSpec, ScriptLocation, Vec3Param,
} from './types';
// Re-export so consumers can import CanonicalFace from the same module as FaceLabelsMap.
export type { CanonicalFace };
import type { FaceQuery } from './queryTypes';

export type ShapeTransform =
  | { op: 'translate'; vec: Vec3Param }
  | { op: 'rotateAxis'; axis: Vec3Param; degrees: Param; pivot?: Vec3Param }
  | { op: 'scale'; sx: number; sy: number; sz: number }
  | { op: 'reflect'; plane: PlaneSpec };

export interface FeatureRecord {
  id: FeatureId;
  kind: FeatureKind;
  inputs: Record<string, FeatureRef>;
  params: Record<string, Param>;
  transforms: ShapeTransform[];
  scriptLocation?: ScriptLocation;
  suppressed: boolean;
  metadata?: Record<string, unknown>;
}

/** Map of user-chosen label → resolution target. Stored under
 *  FeatureRecord.metadata.faceLabels for kinds that accept it (box, cylinder,
 *  extrude, revolve, sweep, loft). Sphere rejects this key at capture time. */
export type FaceLabelsMap = Record<string, CanonicalFace | FaceQuery>;
