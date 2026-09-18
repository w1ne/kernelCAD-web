// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/featureMeshingPhases.ts
//
// Phase helpers extracted verbatim out of `meshFeaturesPerFeature`'s
// `onEvent` handler in featureMeshing.ts, to keep that closure's cyclomatic
// complexity under the quality-ratchet gate. Code moved here unchanged;
// only free variables (`minX`/`maxX`/… → a shared `bounds` accumulator,
// `event.featureId` → explicit params) were threaded through.
import type { FeatureId, FeatureKind, FeatureRef } from '../../shared/intent/types';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FaceGeometry } from '../../shared/worker/workerTypes';
import type { PBRMaterial } from '../../shared/intent/material';
import type { ReferenceImageMetadata } from '../../shared/intent/referenceImageRecord';
import type { RenderEnvironmentMetadata } from '../../shared/intent/renderEnvironmentRecord';
import type { CameraTargetMetadata } from '../../shared/intent/cameraTargetRecord';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { OcctBackend, pbrFromMetadata } from '../../kernel/backends/occt/occtBackend';
import { meshShape } from '../../kernel/backends/occt/meshing';
import { resolveFaceLabelToFace } from '../../kernel/backends/occt/edgeSelection';
import { faceHashOf } from '../../kernel/backends/occt/createdRefs';
import { transformFeatureMesh } from './transformMesh';
import { Transform } from '../../shared/runtime/se3';
import type {
  AttributeShadowingWarning,
  Bounds,
  FeatureMesh,
  PerFaceMaterialWarning,
  ShadowedAttribute,
} from './featureMeshing';

export interface MeshBoundsAccumulator {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

/** Aggregate bounds from `faces`' vertices into `bounds` in-place. */
export function accumulateMeshBounds(
  bounds: MeshBoundsAccumulator,
  faces: readonly FaceGeometry[],
): void {
  for (const f of faces) {
    for (let i = 0; i < f.vertices.length; i += 3) {
      const x = f.vertices[i], y = f.vertices[i + 1], z = f.vertices[i + 2];
      if (x < bounds.minX) bounds.minX = x; if (x > bounds.maxX) bounds.maxX = x;
      if (y < bounds.minY) bounds.minY = y; if (y > bounds.maxY) bounds.maxY = y;
      if (z < bounds.minZ) bounds.minZ = z; if (z > bounds.maxZ) bounds.maxZ = z;
    }
  }
}


// Per-face material resolution. For each label in materialByLabel,
// resolve label → Face via the same machinery the edge-feature
// lowerers use (resolveFaceLabelToFace), hash the matched face, then
// walk `shape.faces` (the iteration source for meshShape's faceId
// integer) to find the index whose hash matches. Attach the PBR to
// that integer index. Unresolved labels surface a soft warning;
// unmatched faces fall back to the shape-level `material`.
export function resolvePerFaceMaterialOverrides(
  featureId: FeatureId,
  shape: OcctBackend,
  perFaceMap: Record<string, PBRMaterial>,
  records: readonly FeatureRecord[],
  warnings: PerFaceMaterialWarning[],
): Record<number, PBRMaterial> | undefined {
  let materialByFaceId: Record<number, PBRMaterial> | undefined;
  const base = shape;
  // Walk shape.faces ONCE and hash every face so resolution is O(F + L)
  // not O(F * L). The replicad shape.faces iteration order matches
  // meshShape's faceId assignment (see meshing.ts:meshShape).
  const replicadFaces = (base.getReplicadShape() as unknown as { faces: unknown[] }).faces;
  const faceIdByHash = new Map<string, number>();
  replicadFaces.forEach((f, idx) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      faceIdByHash.set(faceHashOf(f as any), idx);
    } catch {
      // skip un-hashable faces; they simply won't get per-face overrides
    }
  });

  const record = records.find(r => r.id === featureId);
  if (record !== undefined) {
    for (const [label, pbr] of Object.entries(perFaceMap)) {
      const resolved = resolveFaceLabelToFace(record, base, label, records);
      if ('error' in resolved) {
        // Resolver collisions / canonical-not-applicable etc. — surface as
        // soft no-match warning so the build continues. The error fields
        // (code, severity 'error') are owned by the resolver; we lift
        // only the label so the agent knows which call failed.
        warnings.push({
          code: 'feature.material.face-label-no-match',
          featureId,
          label,
          detail: resolved.error.message,
        });
        continue;
      }
      let hash: string;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hash = faceHashOf(resolved.face as any);
      } catch {
        warnings.push({
          code: 'feature.material.face-label-no-match',
          featureId,
          label,
          detail: `Resolved face for '${label}' could not be hashed.`,
        });
        continue;
      }
      const idx = faceIdByHash.get(hash);
      if (idx === undefined) {
        warnings.push({
          code: 'feature.material.face-label-no-match',
          featureId,
          label,
          detail: `Resolved face hash '${hash}' for label '${label}' not present in the meshed face set.`,
        });
        continue;
      }
      if (materialByFaceId === undefined) materialByFaceId = {};
      materialByFaceId[idx] = pbr;
    }
  }
  return materialByFaceId;
}

export interface SceneFanoutCtx {
  emitFeature: (mesh: FeatureMesh) => void;
  bounds: MeshBoundsAccumulator;
  failedFeatureIds: FeatureId[];
  cachedAssemblyPartMeshes?: Map<FeatureId, Map<string, { faces: FaceGeometry[]; volume?: number; edges?: Float32Array }>>;
  explodeOffsets?: ReadonlyMap<string, readonly [number, number, number]>;
  assembliesIn?: ReadonlyMap<string, unknown>;
  recordById: ReadonlyMap<FeatureId, FeatureRecord>;
  /** Injected from featureMeshing.ts to avoid an import cycle: these are
   *  module-private helpers of that file. */
  attachPlanarUVs: (faces: FaceGeometry[]) => void;
  extractRawShape: (backend: ShapeBackend) => unknown;
  meshIdentityFields: (args: {
    featureId: FeatureId;
    featureKind: FeatureKind;
    sourceMetadataName?: string;
    assemblyFeatureId?: FeatureId;
    assemblyPartName?: string;
  }) => Pick<FeatureMesh, 'displayName' | 'filterNames' | 'sourceMetadataName'>;
  metadataNameOf: (record: FeatureRecord | undefined) => string | undefined;
  collectTendonMeshes: (
    sceneShape: unknown,
    sceneFeatureId: FeatureId,
    assemblies: ReadonlyMap<string, unknown> | undefined,
  ) => FeatureMesh[];
}

// SceneBackend (assembly multi-body) → fan out one FeatureMesh per
// assembly part, with composite featureId, the assembly feature as
// the sole predecessor, per-part color, and a viewport transform.
// Keep vertices in each part's local frame so Studio can pose parts
// by changing group matrices instead of remeshing on every joint tick.
export function emitSceneBackendFanout(
  featureId: FeatureId,
  featureKind: FeatureKind,
  shape: SceneBackend,
  ctx: SceneFanoutCtx,
): void {
  const {
    emitFeature, bounds, failedFeatureIds, cachedAssemblyPartMeshes, explodeOffsets, assembliesIn, recordById,
    attachPlanarUVs, extractRawShape, meshIdentityFields, metadataNameOf, collectTendonMeshes,
  } = ctx;
  let partCache = cachedAssemblyPartMeshes?.get(featureId);
  // Track part-meshing outcomes so an assembly whose parts ALL fail to
  // mesh is surfaced as a failure rather than returning a silently-empty
  // (but "successful") build. A partial assembly — at least one part
  // meshed — must still render, so we only fail when nothing was emitted.
  const partCount = shape.parts.length;
  let emittedPartCount = 0;
  for (const part of shape.parts) {
    // Pose-cache fast path: when the assembly is being re-lowered for a
    // pose-only edit, the per-part LOCAL shape is unchanged (same OCCT
    // backend instance is reused via the engine's seedShapes seed) and
    // only `part.worldTransform` has refreshed. Reuse cached triangle
    // data so we skip the expensive `meshShape()` call per part.
    const cachedPart = partCache?.get(part.name);
    let faces: FaceGeometry[];
    let volume: number | undefined;
    let edges: Float32Array | undefined;
    if (cachedPart) {
      faces = cachedPart.faces;
      volume = cachedPart.volume;
      edges = cachedPart.edges;
    } else {
      const meshed = meshShape(extractRawShape(part.shape));
      if (!meshed) {
        // Per-part shape failed to mesh. Skip THIS part — the lowerer
        // already populated the part shape, and a single bad part must
        // not sink an otherwise-renderable assembly. Surface a soft
        // warning so the skip is not silently lost; the post-loop check
        // below escalates to a hard failure only when EVERY part skips.
        console.warn(
          `meshFeaturesPerFeature: assembly '${featureId}' part '${part.name}' compiled but produced no mesh — skipping part`,
        );
        continue;
      }
      faces = meshed.faces;
      volume = meshed.volume;
      edges = meshed.edges;
      if (cachedAssemblyPartMeshes !== undefined) {
        if (!partCache) {
          partCache = new Map();
          cachedAssemblyPartMeshes.set(featureId, partCache);
        }
        partCache.set(part.name, { faces, ...(volume !== undefined ? { volume } : {}), ...(edges ? { edges } : {}) });
      }
    }
    const local: FeatureMesh = {
      featureId: `${featureId}__${part.name}`,
      featureKind: featureKind,
      predecessors: [featureId],
      // op intentionally omitted (no boolean op for assembly parts)
      faces,
      ...(volume !== undefined ? { volume } : {}),
      ...(edges ? { edges } : {}),
    };
    if (!cachedPart) attachPlanarUVs(local.faces);
    const extra = explodeOffsets?.get(part.name);
    const worldT = extra !== undefined
      ? Transform.translation(extra[0], extra[1], extra[2]).compose(part.worldTransform)
      : part.worldTransform;
    emitFeature({
      ...local,
      assemblyFeatureId: featureId,
      assemblyPartName: part.name,
      transform: worldT.toMat4(),
      ...meshIdentityFields({
        featureId: local.featureId,
        featureKind: local.featureKind,
        assemblyFeatureId: featureId,
        assemblyPartName: part.name,
        sourceMetadataName: metadataNameOf(recordById.get(featureId)),
      }),
      ...(part.color !== undefined ? { color: part.color } : {}),
      ...(part.material !== undefined ? { material: part.material } : {}),
    });
    emittedPartCount += 1;
    // Aggregate bounds from FK-transformed vertices while keeping the
    // emitted mesh local for viewport-side transforms.
    const transformed = transformFeatureMesh(local, worldT);
    accumulateMeshBounds(bounds, transformed.faces);
  }
  // Escalate an all-parts-skipped assembly to a hard failure. When the
  // assembly declared at least one part but NONE produced a mesh, the
  // build would otherwise return a successful-but-empty result (zero
  // part-meshes, assembly absent from `failedFeatureIds`). Surface it so
  // the mesh endpoint turns it into a 500 the client can report instead
  // of silently rendering nothing. Partial assemblies (emittedPartCount
  // > 0) still render and are intentionally NOT failed here.
  if (partCount > 0 && emittedPartCount === 0) {
    console.warn(
      `meshFeaturesPerFeature: assembly '${featureId}' produced no part meshes (all ${partCount} part(s) failed to mesh)`,
    );
    failedFeatureIds.push(featureId);
    return;
  }
  // P7 — emit one synthetic tendon FeatureMesh per declared
  // `arm.tendon(...)` record on the owning Assembly. The cylinder
  // geometry is baked in WORLD frame here so it lands as a normal
  // feature group in the renderer (no special path needed) and the
  // centroid-recentre loop composes onto it identically to part
  // groups. Cylinder span uses each owner part's `worldTransform`
  // sourced directly off the SceneBackend.
  const tendonMeshes = collectTendonMeshes(shape, featureId, assembliesIn);
  for (const tm of tendonMeshes) {
    emitFeature(tm);
    accumulateMeshBounds(bounds, tm.faces);
  }
}

export interface FeatureStyling {
  readonly colorByFeatureId: Map<FeatureId, string>;
  readonly materialByFeatureId: Map<FeatureId, PBRMaterial>;
  readonly explicitMaterialByFeatureId: Map<FeatureId, PBRMaterial>;
  readonly materialByLabelByFeatureId: Map<FeatureId, Record<string, PBRMaterial>>;
}

// Lookup tables for record metadata: `metadata.color`, the full PBR material
// derived from metadata, materials the author wrote EXPLICITLY via
// `.material({...})` (distinct from `materialByFeatureId`, which also contains
// materials *promoted* from `metadata.color` by `pbrFromMetadata` — shadowing
// diagnostics must use the explicit map), and per-face PBR overrides.
export function collectFeatureStyling(records: readonly FeatureRecord[]): FeatureStyling {
  const colorByFeatureId = new Map<FeatureId, string>();
  const materialByFeatureId = new Map<FeatureId, PBRMaterial>();
  const explicitMaterialByFeatureId = new Map<FeatureId, PBRMaterial>();
  const materialByLabelByFeatureId = new Map<FeatureId, Record<string, PBRMaterial>>();
  for (const r of records) {
    const color = (r.metadata as { color?: unknown } | undefined)?.color;
    if (typeof color === 'string') colorByFeatureId.set(r.id, color);
    const pbr = pbrFromMetadata(r.metadata as Record<string, unknown> | undefined);
    if (pbr !== undefined) materialByFeatureId.set(r.id, pbr);
    const explicitMaterial = (r.metadata as { material?: unknown } | undefined)?.material;
    if (explicitMaterial !== undefined && typeof explicitMaterial === 'object') {
      explicitMaterialByFeatureId.set(r.id, explicitMaterial as PBRMaterial);
    }
    const perFace = (r.metadata as { materialByLabel?: Record<string, PBRMaterial> } | undefined)
      ?.materialByLabel;
    if (perFace !== undefined && Object.keys(perFace).length > 0) {
      materialByLabelByFeatureId.set(r.id, perFace);
    }
  }
  return {
    colorByFeatureId,
    materialByFeatureId,
    explicitMaterialByFeatureId,
    materialByLabelByFeatureId,
  };
}

// Emit virtual records (referenceImage, renderEnvironment, etc.) directly —
// they produce no OCCT geometry, but the renderer needs their payload to
// materialize overlays / IBL.
export function emitVirtualFeatureRecords(
  records: readonly FeatureRecord[],
  emitFeature: (mesh: FeatureMesh) => void,
): void {
  for (const r of records) {
    if (r.metadata?.virtual === true) {
      const refImg = r.kind === 'referenceImage'
        ? (r.metadata as unknown as ReferenceImageMetadata)
        : undefined;
      const renderEnv = r.kind === 'renderEnvironment'
        ? (r.metadata as unknown as RenderEnvironmentMetadata)
        : undefined;
      const cameraTgt = r.kind === 'cameraTarget'
        ? (r.metadata as unknown as CameraTargetMetadata)
        : undefined;
      emitFeature({
        featureId: r.id,
        featureKind: r.kind,
        predecessors: [],
        faces: [],
        virtual: true,
        ...meshIdentityFields({
          featureId: r.id,
          featureKind: r.kind,
          sourceMetadataName: metadataNameOf(r),
        }),
        ...(refImg !== undefined ? { referenceImage: refImg } : {}),
        ...(renderEnv !== undefined ? { renderEnvironment: renderEnv } : {}),
        ...(cameraTgt !== undefined ? { cameraTarget: cameraTgt } : {}),
      });
    }
  }
}

// Derive the seedShapes set for `engine.run`. A record can be safely
// skipped from re-lowering when its cached lowered shape is still in
// `cachedShapesIn` AND one of:
//   (a) the record is in the construction closure (its mesh emits only via
//       the downstream assembly fan-out — its own `feature.compiled` event
//       is filtered out regardless), OR
//   (b) we have a cached `FeatureMesh` for it (we re-emit the cached mesh
//       directly after `engine.run` finishes).
export function deriveSeedShapes(
  records: readonly FeatureRecord[],
  constructionClosure: ReadonlySet<FeatureId>,
  cachedShapesIn: ReadonlyMap<FeatureId, ShapeBackend> | undefined,
  cachedFeatureMeshes: ReadonlyMap<FeatureId, FeatureMesh> | undefined,
): Map<FeatureId, ShapeBackend> | undefined {
  return cachedShapesIn !== undefined
    ? (() => {
        const seed = new Map<FeatureId, ShapeBackend>();
        for (const r of records) {
          const cached = cachedShapesIn.get(r.id);
          if (!cached) continue;
          if (constructionClosure.has(r.id) || cachedFeatureMeshes?.has(r.id)) {
            seed.set(r.id, cached);
          }
        }
        return seed;
      })()
    : undefined;
}

// Records whose lowered shape was passed in `seedShapes` are skipped by the
// recompute engine — `feature.compiled` is NOT emitted for them, so the
// onEvent path never runs. Re-emit cached `FeatureMesh` entries for
// non-construction-closure records here so the response still carries
// those records' meshes. Construction-closure records emit only via the
// assembly fan-out, so they don't need a re-emit here.
export function reEmitSeededFeatureMeshes(
  records: readonly FeatureRecord[],
  seedShapes: ReadonlyMap<FeatureId, ShapeBackend> | undefined,
  cachedFeatureMeshes: Map<FeatureId, FeatureMesh> | undefined,
  constructionClosure: ReadonlySet<FeatureId>,
  features: readonly FeatureMesh[],
  emitFeature: (mesh: FeatureMesh) => void,
  meshBounds: MeshBoundsAccumulator,
): void {
  if (seedShapes === undefined || seedShapes.size === 0 || !cachedFeatureMeshes) return;
  const emittedIds = new Set(features.map((f) => f.featureId));
  for (const r of records) {
    if (!seedShapes.has(r.id)) continue;
    if (emittedIds.has(r.id)) continue;
    if (constructionClosure.has(r.id)) continue;
    const cached = cachedFeatureMeshes.get(r.id);
    if (!cached) continue;
    const mesh = cached as FeatureMesh;
    emitFeature(mesh);
    accumulateMeshBounds(meshBounds, mesh.faces);
  }
}

export function buildMeshBounds(
  features: readonly FeatureMesh[],
  meshBounds: MeshBoundsAccumulator,
): Bounds {
  return {
    min: features.length > 0 ? [meshBounds.minX, meshBounds.minY, meshBounds.minZ] : [0, 0, 0],
    max: features.length > 0 ? [meshBounds.maxX, meshBounds.maxY, meshBounds.maxZ] : [0, 0, 0],
  };
}

// Same detector, same DAG rule, applied to both `.material()` and `.color()`.
// Color is attributed by the identical metadata mechanism, so forking a
// parallel detector would be two sources of truth for one rule.
export function collectShadowingWarnings(
  features: readonly FeatureMesh[],
  explicitMaterialByFeatureId: ReadonlyMap<FeatureId, PBRMaterial>,
  colorByFeatureId: ReadonlyMap<FeatureId, string>,
): {
  readonly materialShadowingWarnings: AttributeShadowingWarning[];
  readonly colorShadowingWarnings: AttributeShadowingWarning[];
} {
  const materialShadowingWarnings = detectAttributeShadowing(
    features,
    explicitMaterialByFeatureId,
    'material',
  );
  const colorShadowingWarnings = detectAttributeShadowing(
    features,
    colorByFeatureId,
    'color',
  );
  return { materialShadowingWarnings, colorShadowingWarnings };
}

export function uniqueStrings(values: readonly (string | undefined)[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (value === undefined || value.length === 0 || out.includes(value)) continue;
    out.push(value);
  }
  return out;
}

export function metadataNameOf(record: FeatureRecord | undefined): string | undefined {
  const name = (record?.metadata as { name?: unknown } | undefined)?.name;
  return typeof name === 'string' && name.length > 0 ? name : undefined;
}

/**
 * Compute the construction-input closure: feature IDs whose meshes the
 * SceneBackend fan-out path subsumes. Skipping these in the per-feature
 * meshing pass prevents intermediate primitives (boxes, fillets, holes,
 * boolean cutters, sketch profiles) from being emitted at LOCAL frame —
 * they would otherwise stack at the origin and drown out the colored
 * assembly fan-out.
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
export function computeConstructionClosure(
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

export function splitConnectorRef(ref: string): [string | undefined, string | undefined] {
  const dot = ref.indexOf('.');
  if (dot <= 0 || dot === ref.length - 1) return [undefined, undefined];
  return [ref.slice(0, dot), ref.slice(dot + 1)];
}

export function meshIdentityFields(args: {
  featureId: FeatureId;
  featureKind: FeatureKind;
  sourceMetadataName?: string;
  assemblyFeatureId?: FeatureId;
  assemblyPartName?: string;
}): Pick<FeatureMesh, 'displayName' | 'filterNames' | 'sourceMetadataName'> {
  const filterNames = uniqueStrings([
    args.featureId,
    args.featureKind,
    args.assemblyFeatureId,
    args.assemblyPartName,
    args.sourceMetadataName,
  ]);
  return {
    displayName: args.assemblyPartName ?? args.sourceMetadataName ?? args.featureId,
    filterNames,
    ...(args.sourceMetadataName !== undefined ? { sourceMetadataName: args.sourceMetadataName } : {}),
  };
}

/**
 * Walk the post-mesh DAG forward from each attributed leaf. Emit a warning for
 * every (leaf, shadowing-boolean) pair where the leaf is reachable via a chain
 * of union/intersect predecessors from a downstream record that ALSO carries
 * its own attribution of the same kind. The leaf's attribution survives only on
 * the intermediate group during the build animation; the post-fuse silhouette
 * carries the head record's.
 *
 * Generic over the attribute (`material` | `color`) because both are attributed
 * by the same `FeatureRecord.metadata` mechanism and therefore obey the same
 * shadowing rule. One detector, one source of truth.
 *
 * Walk semantics:
 *   - Visit each attributed leaf exactly once.
 *   - Reverse-adjacency lookup is built from `feature.predecessors`.
 *   - We follow boolean fuse-style edges only (op === 'union' | 'intersect').
 *     subtract edges represent cutters that DON'T enter the post-fuse mesh,
 *     so a leaf consumed only as a `subtract` cutter never produces a
 *     shadowing warning.
 *   - The first attributed descendant on each forward path is the "shadowing"
 *     record reported.
 *   - A head with NO attribution of its own is NOT a shadower: nothing
 *     competes for the silhouette, so warning there would be a false positive
 *     on the common single-color-on-leaf pattern.
 */
function detectAttributeShadowing(
  features: readonly FeatureMesh[],
  attributeByFeatureId: ReadonlyMap<FeatureId, PBRMaterial | string>,
  attribute: ShadowedAttribute,
): AttributeShadowingWarning[] {
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

  const out: AttributeShadowingWarning[] = [];
  for (const leaf of features) {
    if (leaf.virtual) continue;
    if (!attributeByFeatureId.has(leaf.featureId)) continue;

    // BFS forward; stop at the first attributed descendant on each
    // branch. We only need one shadower per leaf for the diagnostic; if
    // there's a chain (.union().union().union()), the FIRST one with its
    // own attribution is the load-bearing one.
    const visited = new Set<FeatureId>([leaf.featureId]);
    const queue: FeatureId[] = [];
    const seedDescendants = descendantsByPredecessor.get(leaf.featureId);
    if (seedDescendants) queue.push(...seedDescendants);

    let shadower: FeatureMesh | undefined;
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      if (attributeByFeatureId.has(id)) {
        shadower = featureById.get(id);
        break;
      }
      const next = descendantsByPredecessor.get(id);
      if (next) queue.push(...next);
    }

    if (shadower) {
      out.push({
        attribute,
        leafFeatureId: leaf.featureId,
        leafFeatureKind: leaf.featureKind,
        shadowingFeatureId: shadower.featureId,
        shadowingFeatureKind: shadower.featureKind,
        message:
          `leaf '${leaf.featureId}' (${leaf.featureKind}) has its own ${attribute} but is unioned into ` +
          `'${shadower.featureId}' (${shadower.featureKind}) which also has its own ${attribute}. ` +
          `The leaf ${attribute} is visible during the build animation only; the static render ` +
          `(kernelcad render, post-rotate capture-demo) shows the head ${attribute} on the fused silhouette. ` +
          `To preserve per-leaf ${attribute} in the static render, split the construction so the leaf is not ` +
          `unioned into a ${attribute}-bearing parent, or author the leaf as a separate assemblyPart.`,
      });
    }
  }

  return out;
}
