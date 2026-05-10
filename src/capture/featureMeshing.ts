// src/capture/featureMeshing.ts
import type { FeatureId, FeatureKind } from '../intent/types';
import type { FeatureRecord } from '../intent/featureRecord';
import type { FaceGeometry } from '../lib/workerTypes';
import type { ShapeBackend } from '../backends/backend';
import { OcctLowerer } from '../backends/occt/occtLowerer';
import { OcctBackend, initOcct } from '../backends/occt/occtBackend';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { meshShape } from '../backends/occt/meshing';
import { isSceneBackend } from '../backends/sceneBackend';
import { transformFeatureMesh } from './transformMesh';

/** Extract the raw replicad shape so meshShape() can walk .faces / .meshEdges. */
function extractRawShape(backend: ShapeBackend): unknown {
  if (backend instanceof OcctBackend) {
    return backend.getReplicadShape();
  }
  throw new Error(
    `meshFeaturesPerFeature: unsupported backend target '${backend.target}' — only OcctBackend is supported`
  );
}

export interface FeatureMesh {
  featureId: FeatureId;
  featureKind: FeatureKind;
  predecessors: FeatureId[];
  op?: 'subtract' | 'union' | 'intersect';
  faces: FaceGeometry[];
  volume?: number;
  edges?: Float32Array;
  /** Color attribute carried from FeatureRecord.metadata.color (a ColorToken
   *  or `#rrggbb` hex). Renderer resolves via `resolveColor()`; absent means
   *  use the renderer's default. */
  color?: string;
}

export interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
}

export interface MeshFeaturesResult {
  features: FeatureMesh[];
  bounds: Bounds;
  failedFeatureIds: FeatureId[];  // empty array if no failures
}

export async function meshFeaturesPerFeature(
  records: readonly FeatureRecord[],
  paramTable?: import('../runtime/paramTable').ParamTable,
): Promise<MeshFeaturesResult> {
  await initOcct();
  const engine = new RecomputeEngine(new OcctLowerer());
  const features: FeatureMesh[] = [];
  const failedFeatureIds: FeatureId[] = [];
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  // Lookup table for record metadata.color so we can attach it onto each
  // FeatureMesh when feature.compiled fires. Renderer resolves via ROLE_PALETTE.
  const colorByFeatureId = new Map<FeatureId, string>();
  for (const r of records) {
    const color = (r.metadata as { color?: unknown } | undefined)?.color;
    if (typeof color === 'string') colorByFeatureId.set(r.id, color);
  }

  await engine.run(records, {
    paramTable,
    onEvent: (event) => {
      if (event.kind === 'feature.failed') {
        failedFeatureIds.push(event.featureId);
        return;
      }
      if (event.kind !== 'feature.compiled') return;

      // SceneBackend (assembly multi-body) → fan out one FeatureMesh per
      // assembly part, with composite featureId, the assembly feature as
      // the sole predecessor, per-part color, and FK-transformed vertices/
      // normals/edges/plane via the shared transformFeatureMesh helper.
      if (isSceneBackend(event.shape)) {
        for (const part of event.shape.parts) {
          const meshed = meshShape(extractRawShape(part.shape));
          if (!meshed) {
            // Per-part shape failed to mesh; skip silently — the lowerer
            // already populated the part shape, and the SceneBackend itself
            // is not a single-shape unit so we don't fail the whole assembly.
            continue;
          }
          const local: FeatureMesh = {
            featureId: `${event.featureId}__${part.name}`,
            featureKind: event.featureKind,
            predecessors: [event.featureId],
            // op intentionally omitted (no boolean op for assembly parts)
            faces: meshed.faces,
            volume: meshed.volume,
            ...(meshed.edges ? { edges: meshed.edges } : {}),
          };
          const transformed = transformFeatureMesh(local, part.worldTransform);
          features.push({
            ...transformed,
            ...(part.color !== undefined ? { color: part.color } : {}),
          });
          // Aggregate bounds from FK-transformed vertices.
          for (const f of transformed.faces) {
            for (let i = 0; i < f.vertices.length; i += 3) {
              const x = f.vertices[i], y = f.vertices[i + 1], z = f.vertices[i + 2];
              if (x < minX) minX = x; if (x > maxX) maxX = x;
              if (y < minY) minY = y; if (y > maxY) maxY = y;
              if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
            }
          }
        }
        return;
      }

      const meshed = meshShape(extractRawShape(event.shape));
      if (!meshed) {
        if (event.featureKind === 'sketch') {
          return;
        }
        // Compiled but un-meshable (e.g., empty face iterable, all faces failed
        // to mesh). Surface as a failure so captureDemo aborts instead of
        // silently producing a scene with a missing feature group.
        console.warn(`meshFeaturesPerFeature: feature '${event.featureId}' compiled but produced no mesh`);
        failedFeatureIds.push(event.featureId);
        return;
      }

      const color = colorByFeatureId.get(event.featureId);
      features.push({
        featureId: event.featureId,
        featureKind: event.featureKind,
        predecessors: event.predecessors,
        op: event.op,
        faces: meshed.faces,
        volume: meshed.volume,
        edges: meshed.edges,
        ...(color !== undefined ? { color } : {}),
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

  return { features, bounds, failedFeatureIds };
}
