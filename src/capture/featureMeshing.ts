// src/capture/featureMeshing.ts
import type { FeatureId, FeatureKind } from '../intent/types';
import type { FeatureRecord } from '../intent/featureRecord';
import type { FaceGeometry } from '../lib/workerTypes';

export interface FeatureMesh {
  featureId: FeatureId;
  featureKind: FeatureKind;
  predecessors: FeatureId[];
  op?: 'subtract' | 'union' | 'intersect';
  faces: FaceGeometry[];
  volume?: number;
  edges?: Float32Array;
}

export interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
}

export interface MeshFeaturesResult {
  features: FeatureMesh[];
  bounds: Bounds;
}

export async function meshFeaturesPerFeature(
  _records: readonly FeatureRecord[],
): Promise<MeshFeaturesResult> {
  throw new Error('not implemented'); // Filled in Task 3.
}
