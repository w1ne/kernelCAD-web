// src/capture/featureMeshing.ts
import type { FeatureId, FeatureKind } from '../intent/types';
import type { FeatureRecord } from '../intent/featureRecord';
import type { FaceGeometry } from '../lib/workerTypes';
import type { ShapeBackend } from '../backends/backend';
import { OcctLowerer } from '../backends/occt/occtLowerer';
import { OcctBackend } from '../backends/occt/occtBackend';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { meshShape } from '../backends/occt/meshing';

/** Extract the raw replicad shape so meshShape() can walk .faces / .meshEdges. */
function extractRawShape(backend: ShapeBackend): unknown {
  if (backend instanceof OcctBackend) {
    return backend.getReplicadShape();
  }
  return backend;
}

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
  records: readonly FeatureRecord[],
): Promise<MeshFeaturesResult> {
  const engine = new RecomputeEngine(new OcctLowerer());
  const features: FeatureMesh[] = [];
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  await engine.run(records, {
    onEvent: (event) => {
      if (event.kind !== 'feature.compiled') return;
      const meshed = meshShape(extractRawShape(event.shape));
      if (!meshed) return;

      features.push({
        featureId: event.featureId,
        featureKind: event.featureKind,
        predecessors: event.predecessors,
        op: event.op,
        faces: meshed.faces,
        volume: meshed.volume,
        edges: meshed.edges,
      });

      // Aggregate bounds from this feature's vertices
      for (const f of meshed.faces) {
        for (let i = 0; i < f.vertices.length; i += 3) {
          const x = f.vertices[i], y = f.vertices[i + 1], z = f.vertices[i + 2];
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        }
      }
    },
  });

  const bounds: Bounds = {
    min: features.length > 0 ? [minX, minY, minZ] : [0, 0, 0],
    max: features.length > 0 ? [maxX, maxY, maxZ] : [0, 0, 0],
  };

  return { features, bounds };
}
