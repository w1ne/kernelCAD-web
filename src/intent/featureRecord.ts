import type {
  FeatureId, FeatureKind, FeatureRef, Param, PlaneSpec, ScriptLocation,
  Vec3,
} from './types';

export type ShapeTransform =
  | { op: 'translate'; x: number; y: number; z: number }
  | { op: 'rotateAxis'; axis: Vec3; degrees: number; pivot?: Vec3 }
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
