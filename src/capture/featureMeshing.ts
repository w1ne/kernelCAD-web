// src/capture/featureMeshing.ts
import type { FeatureId, FeatureKind, FeatureRef } from '../intent/types';
import type { FeatureRecord } from '../intent/featureRecord';
import type { FaceGeometry } from '../lib/workerTypes';
import type { ShapeBackend } from '../kernel/backends/backend';
import { OcctLowerer } from '../kernel/backends/occt/occtLowerer';
import { OcctBackend, initOcct } from '../kernel/backends/occt/occtBackend';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { meshShape } from '../kernel/backends/occt/meshing';
import { isSceneBackend } from '../kernel/backends/sceneBackend';
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

/**
 * Compute the construction-input closure: feature IDs whose meshes the
 * SceneBackend fan-out path subsumes. Skipping these in the per-feature
 * meshing pass prevents intermediate primitives (boxes, fillets, holes,
 * boolean cutters, sketch profiles) from being emitted at LOCAL frame —
 * they would otherwise stack at the origin and drown out the colored,
 * FK-posed assembly fan-out.
 *
 * Members of the closure:
 *   - Every `assemblyPart`, `assemblyJoint`, `assemblyConnect` record (these
 *     are construction nodes that don't produce renderable single-shape
 *     geometry on their own; the assembly model/export consumer fans them
 *     out via SceneBackend).
 *   - The transitive set of records reachable via any `kind: 'feature'`
 *     input ref starting from each `assemblyPart`'s `inputs.shape`. The
 *     walk follows ALL feature-kind input fields so it catches `base`,
 *     `target`, `shape`, `profile`, `cutter_N` (boolean), etc. — anything
 *     a part's source shape was constructed from.
 *
 * The walker terminates naturally on primitives (no upstream feature-kind
 * inputs) and is cycle-safe via the visited set.
 *
 * Returns an empty set when no `assemblyPart` records exist — non-assembly
 * scripts (e.g. `box(10,10,10).fillet(...)`) emit FeatureMesh entries
 * unchanged.
 */
function computeConstructionClosure(
  records: readonly FeatureRecord[],
): Set<FeatureId> {
  const closure = new Set<FeatureId>();
  const recordById = new Map<FeatureId, FeatureRecord>();
  for (const r of records) recordById.set(r.id, r);

  // Seed with assembly construction-node IDs (the part/joint/connect
  // records themselves don't produce renderable single-shape meshes —
  // SceneBackend handles their composed presentation).
  for (const r of records) {
    if (
      r.kind === 'assemblyPart' ||
      r.kind === 'assemblyJoint' ||
      r.kind === 'assemblyConnect'
    ) {
      closure.add(r.id);
    }
  }

  // Walk upstream from each assemblyPart's source shape, visiting all
  // feature-kind input refs transitively. Any record that contributes to
  // the BUILD of an assembly part is construction debris from the
  // renderer's perspective.
  const queue: FeatureId[] = [];
  for (const r of records) {
    if (r.kind !== 'assemblyPart') continue;
    const shapeRef = r.inputs.shape as FeatureRef | undefined;
    if (shapeRef && shapeRef.kind === 'feature') queue.push(shapeRef.id);
  }

  while (queue.length > 0) {
    const id = queue.pop()!;
    if (closure.has(id)) continue;
    closure.add(id);
    const record = recordById.get(id);
    if (record === undefined) continue;
    for (const value of Object.values(record.inputs)) {
      // Follow plain feature refs only. face/edge/vertex refs reference
      // geometry on a feature already covered via base/target.
      if (value && (value as FeatureRef).kind === 'feature') {
        queue.push((value as { id: FeatureId }).id);
      }
    }
  }

  return closure;
}

export async function meshFeaturesPerFeature(
  records: readonly FeatureRecord[],
  paramTable?: import('../runtime/paramTable').ParamTable,
  /** v0.5: when records contain `importedStep` features, pass the
   *  originating session so the lowerer can find the pre-imported
   *  OcctBackend instances. Optional — scripts without `lib.fromSTEP`
   *  work unchanged.
   *  W1.3: also threads through `getSurfaceRecord` for NURBS surface
   *  resolution. */
  session?: {
    importedGeometry: Map<FeatureId, ShapeBackend>;
    getSurfaceRecord?: (
      id: import('../intent/surfaceRecord').SurfaceId,
    ) => import('../intent/surfaceRecord').SurfaceRecord | undefined;
  },
): Promise<MeshFeaturesResult> {
  await initOcct();
  const lowerer = new OcctLowerer();
  if (session) {
    lowerer.importedGeometry = session.importedGeometry;
    if (session.getSurfaceRecord) {
      lowerer.getSurfaceRecord = session.getSurfaceRecord.bind(session);
    }
  }
  const engine = new RecomputeEngine(lowerer);
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

  // Pre-compute the construction-input closure (records whose meshes are
  // subsumed by the SceneBackend fan-out). Empty set when no assemblyPart
  // records exist, so single-shape scripts are unaffected.
  const constructionClosure = computeConstructionClosure(records);

  await engine.run(records, {
    paramTable,
    onEvent: (event) => {
      if (event.kind === 'feature.failed') {
        failedFeatureIds.push(event.featureId);
        return;
      }
      if (event.kind !== 'feature.compiled') return;

      // Construction-input closure: this record was an intermediate input
      // to an assemblyPart's source shape. Its geometry is already presented
      // (FK-posed, in world frame, with role color) via the SceneBackend
      // fan-out below. Emitting it here would re-render it at LOCAL frame
      // stacked at origin. Note: the SceneBackend feature itself
      // (solvedAssembly / assemblyModel / assemblyExport) is the consumer,
      // not a construction input — it's not in the closure.
      if (constructionClosure.has(event.featureId)) {
        return;
      }

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
