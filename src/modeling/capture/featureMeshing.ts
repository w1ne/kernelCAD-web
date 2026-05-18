// src/modeling/capture/featureMeshing.ts
import type { FeatureId, FeatureKind, FeatureRef } from '../../shared/intent/types';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FaceGeometry } from '../../shared/worker/workerTypes';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { PBRMaterial } from '../../shared/intent/material';
import type { ReferenceImageMetadata } from '../../shared/intent/referenceImageRecord';
import { OcctLowerer } from '../backends/occt/occtLowerer';
import { OcctBackend, initOcct, pbrFromMetadata } from '../../kernel/backends/occt/occtBackend';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { meshShape } from '../../kernel/backends/occt/meshing';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
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
  /** Full PBR material from FeatureRecord.metadata.material (or promoted from
   *  metadata.color). Present when the record has material metadata. The renderer
   *  (Task 8+) prefers this over the legacy `color` string field. */
  material?: PBRMaterial;
  /** True for virtual (non-geometry) records such as referenceImage. */
  virtual?: boolean;
  /** Reference image payload; present when featureKind === 'referenceImage'. */
  referenceImage?: ReferenceImageMetadata;
}

export interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
}

/** Diagnostic emitted when a leaf record with its own explicit material is
 *  consumed by a downstream boolean.fuse (union/intersect) whose head record
 *  also has its own material. The kernel's boolean operation produces a single
 *  post-fuse mesh whose faces inherit the head record's material — the leaf's
 *  material is therefore invisible on the static silhouette (post-fuse render
 *  in `kernelcad render` and after the build animation settles in
 *  `npm run capture-demo`). The leaf material IS visible during the staged
 *  build animation while predecessor groups are still fading.
 *
 *  Authors who want a multi-material static render today must either:
 *    (a) split the construction so the material-bearing leaf is not unioned
 *        into a parent that also has its own material, OR
 *    (b) author the leaf as a separate `assemblyPart` (assembly fan-out path
 *        preserves per-part materials in the static render).
 *
 *  Tracked as a follow-up code fix in
 *  `docs/specs/per-leaf-material-survives-static-render.md`. */
export interface MaterialShadowingWarning {
  leafFeatureId: FeatureId;
  leafFeatureKind: FeatureKind;
  shadowingFeatureId: FeatureId;
  shadowingFeatureKind: FeatureKind;
  message: string;
}

export interface MeshFeaturesResult {
  features: FeatureMesh[];
  bounds: Bounds;
  failedFeatureIds: FeatureId[];  // empty array if no failures
  /** Multi-material diagnostic. See `MaterialShadowingWarning` for context. */
  materialShadowingWarnings: MaterialShadowingWarning[];
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
  paramTable?: import('../../shared/runtime/paramTable').ParamTable,
  /** v0.5: when records contain `importedStep` features, pass the
   *  originating session so the lowerer can find the pre-imported
   *  OcctBackend instances. Optional — scripts without `lib.fromSTEP`
   *  work unchanged.
   *  W1.3: also threads through `getSurfaceRecord` for NURBS surface
   *  resolution. */
  session?: {
    importedGeometry: Map<FeatureId, ShapeBackend>;
    getSurfaceRecord?: (
      id: import('../../shared/intent/surfaceRecord').SurfaceId,
    ) => import('../../shared/intent/surfaceRecord').SurfaceRecord | undefined;
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
  // Lookup table for full PBR material derived from record metadata.
  const materialByFeatureId = new Map<FeatureId, PBRMaterial>();
  for (const r of records) {
    const color = (r.metadata as { color?: unknown } | undefined)?.color;
    if (typeof color === 'string') colorByFeatureId.set(r.id, color);
    const pbr = pbrFromMetadata(r.metadata as Record<string, unknown> | undefined);
    if (pbr !== undefined) materialByFeatureId.set(r.id, pbr);
  }

  // Emit virtual records (referenceImage etc.) directly — they produce no OCCT
  // geometry, but the renderer needs their payload to materialize overlays.
  for (const r of records) {
    if (r.metadata?.virtual === true) {
      const refImg = r.kind === 'referenceImage'
        ? (r.metadata as unknown as ReferenceImageMetadata)
        : undefined;
      features.push({
        featureId: r.id,
        featureKind: r.kind,
        predecessors: [],
        faces: [],
        virtual: true,
        ...(refImg !== undefined ? { referenceImage: refImg } : {}),
      });
    }
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
      const material = materialByFeatureId.get(event.featureId);
      features.push({
        featureId: event.featureId,
        featureKind: event.featureKind,
        predecessors: event.predecessors,
        op: event.op,
        faces: meshed.faces,
        volume: meshed.volume,
        edges: meshed.edges,
        ...(color !== undefined ? { color } : {}),
        ...(material !== undefined ? { material } : {}),
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

  const materialShadowingWarnings = detectMaterialShadowing(
    features,
    materialByFeatureId,
  );
  for (const w of materialShadowingWarnings) {
    console.warn(`meshFeaturesPerFeature: material shadowing — ${w.message}`);
  }

  return { features, bounds, failedFeatureIds, materialShadowingWarnings };
}

/**
 * Walk the post-mesh DAG forward from each material-bearing leaf. Emit a
 * warning for every (leaf, shadowing-boolean) pair where the leaf is reachable
 * via a chain of union/intersect predecessors from a downstream record that
 * also carries its own material. The leaf's material survives only on the
 * intermediate group during the build animation; the post-fuse silhouette
 * carries the head record's material.
 *
 * Walk semantics:
 *   - Visit each leaf with a material exactly once.
 *   - Reverse-adjacency lookup is built from `feature.predecessors`.
 *   - We follow boolean fuse-style edges only (op === 'union' | 'intersect').
 *     subtract edges represent cutters that DON'T enter the post-fuse mesh,
 *     so a leaf consumed only as a `subtract` cutter never produces a
 *     shadowing warning.
 *   - The first material-bearing descendant on each forward path is the
 *     "shadowing" record reported.
 */
function detectMaterialShadowing(
  features: readonly FeatureMesh[],
  materialByFeatureId: ReadonlyMap<FeatureId, PBRMaterial>,
): MaterialShadowingWarning[] {
  const featureById = new Map<FeatureId, FeatureMesh>();
  for (const f of features) featureById.set(f.featureId, f);

  // Reverse adjacency for fuse-style edges only. A leaf at `id` flows into
  // `descendantsByPredecessor.get(id)` when those descendants list it as a
  // predecessor AND the descendant's op is union/intersect (or no-op, for
  // non-boolean records that just consume the shape — modifiers/transforms
  // preserve material reachability).
  const descendantsByPredecessor = new Map<FeatureId, FeatureId[]>();
  for (const f of features) {
    if (f.virtual) continue;
    // Subtract booleans don't carry the predecessor's volume into the
    // post-fuse mesh — the cutter is consumed. Skip those edges so a
    // hole-cutter with .material() doesn't spuriously warn.
    if (f.op === 'subtract') continue;
    for (const predId of f.predecessors) {
      const list = descendantsByPredecessor.get(predId);
      if (list) list.push(f.featureId);
      else descendantsByPredecessor.set(predId, [f.featureId]);
    }
  }

  const out: MaterialShadowingWarning[] = [];
  for (const leaf of features) {
    if (leaf.virtual) continue;
    if (!materialByFeatureId.has(leaf.featureId)) continue;

    // BFS forward; stop at the first material-bearing descendant on each
    // branch. We only need one shadower per leaf for the diagnostic; if
    // there's a chain (.union().union().union()), the FIRST one with its
    // own material is the load-bearing one.
    const visited = new Set<FeatureId>([leaf.featureId]);
    const queue: FeatureId[] = [];
    const seedDescendants = descendantsByPredecessor.get(leaf.featureId);
    if (seedDescendants) queue.push(...seedDescendants);

    let shadower: FeatureMesh | undefined;
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      if (materialByFeatureId.has(id)) {
        shadower = featureById.get(id);
        break;
      }
      const next = descendantsByPredecessor.get(id);
      if (next) queue.push(...next);
    }

    if (shadower) {
      out.push({
        leafFeatureId: leaf.featureId,
        leafFeatureKind: leaf.featureKind,
        shadowingFeatureId: shadower.featureId,
        shadowingFeatureKind: shadower.featureKind,
        message:
          `leaf '${leaf.featureId}' (${leaf.featureKind}) has its own material but is unioned into ` +
          `'${shadower.featureId}' (${shadower.featureKind}) which also has its own material. ` +
          `The leaf material is visible during the build animation only; the static render ` +
          `(kernelcad render, post-rotate capture-demo) shows the head material on the fused silhouette. ` +
          `To preserve per-leaf material in the static render, split the construction so the leaf is not ` +
          `unioned into a material-bearing parent, or author the leaf as a separate assemblyPart.`,
      });
    }
  }

  return out;
}
