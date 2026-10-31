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
import { isSceneBackend, type SceneBackend, type SceneBackendPart } from '../../kernel/backends/sceneBackend';
import { OcctBackend, pbrFromMetadata } from '../../kernel/backends/occt/occtBackend';
import { clearTriangulation } from '../../kernel/backends/occt/backendMesh';
import { MeshBackend } from '../../kernel/backends/meshBackend';
import { meshShape, type MeshOptions } from '../../kernel/backends/occt/meshing';
import { resolveFaceLabelToFace } from '../../kernel/backends/occt/edgeSelection';
import { faceHashOf } from '../../kernel/backends/occt/createdRefs';
import { transformFeatureMesh } from './transformMesh';
import { computeFeatureOwnership, type FeatureOwnership } from './featureOwnership';
import { Transform } from '../../shared/runtime/se3';
import { attachMaterialUVs } from './planarUv';
import type {
  AttributeShadowingWarning,
  Bounds,
  FeatureMesh,
  MeshFeaturesResult,
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

/** Marker for meshes produced by a PREVIEW pass (the coarse first paint of an
 *  edit). Held on the cached `FeatureMesh` object (WeakSet), so it rides with
 *  cache entries copied between sessions by `carryReusableMeshes`, never
 *  reaches the wire (`serializeForBridge` is explicit), and needs no type
 *  changes anywhere else. A normal display pass refines every marked entry by
 *  re-meshing its already-lowered seeded shape — it never emits coarse
 *  triangles as final and never re-lowers geometry. */
const coarseMeshes = new WeakSet<object>();
export function markCoarseMesh(mesh: FeatureMesh): void { coarseMeshes.add(mesh); }
export function isCoarseMesh(mesh: FeatureMesh): boolean { return coarseMeshes.has(mesh); }

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

/** Fold an indexed render mesh into the aggregate AABB without creating per-face objects. */
export function accumulateIndexedMeshBounds(bounds: MeshBoundsAccumulator, positions: Float32Array): void {
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]!, y = positions[i + 1]!, z = positions[i + 2]!;
    bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y);
    bounds.minZ = Math.min(bounds.minZ, z); bounds.maxZ = Math.max(bounds.maxZ, z);
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
  if (base instanceof MeshBackend) return {};
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
  cachedAssemblyPartMeshes?: Map<FeatureId, Map<string, { shape: ShapeBackend; faces: FaceGeometry[]; volume?: number; edges?: Float32Array; link?: PartLinkData }>>;
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
  /** Record id whose lowered shape is `shape` (a part's `assemblyPart`
   *  record), for per-face ownership of part meshes. */
  ownerIdOfShape?: (shape: ShapeBackend) => FeatureId | undefined;
  recordOrder?: ReadonlyMap<FeatureId, number>;
  accumulateIndexedMeshBounds?: (bounds: MeshBoundsAccumulator, positions: Float32Array) => void;
  /** A PREVIEW pass's looser tessellation options (the coarse first paint of
   *  an edit). When set, freshly meshed parts use them and the per-part cache
   *  is NOT written — a coarse part entry must never satisfy a later display
   *  pass. Display-cached parts are still reused read-only, so a pose-only
   *  re-lower paints from cache in either tier. */
  previewMeshOptions?: MeshOptions;
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
  const { emitFeature, bounds, failedFeatureIds, cachedAssemblyPartMeshes, assembliesIn, collectTendonMeshes } = ctx;
  let partCache = cachedAssemblyPartMeshes?.get(featureId);
  // Track part-meshing outcomes so an assembly whose parts ALL fail to
  // mesh is surfaced as a failure rather than returning a silently-empty
  // (but "successful") build. A partial assembly — at least one part
  // meshed — must still render, so we only fail when nothing was emitted.
  const partCount = shape.parts.length;
  let emittedPartCount = 0;
  for (const part of shape.parts) {
    const resolved = resolveScenePartMesh(featureId, part, partCache, ctx);
    if (resolved === undefined) continue;
    partCache = resolved.partCache;
    const { local, worldT } = emitScenePartMesh(featureId, featureKind, part, resolved, ctx);
    emittedPartCount += 1;
    // Aggregate bounds from FK-transformed vertices while keeping the
    // emitted mesh local for viewport-side transforms.
    if (local.mesh) {
      ctx.accumulateIndexedMeshBounds?.(bounds, local.mesh.positions);
      const bb = transformedIndexedMeshBounds(local.mesh.positions, worldT);
      bounds.minX = Math.min(bounds.minX, bb.min[0]); bounds.minY = Math.min(bounds.minY, bb.min[1]); bounds.minZ = Math.min(bounds.minZ, bb.min[2]);
      bounds.maxX = Math.max(bounds.maxX, bb.max[0]); bounds.maxY = Math.max(bounds.maxY, bb.max[1]); bounds.maxZ = Math.max(bounds.maxZ, bb.max[2]);
    } else {
      const transformed = transformFeatureMesh(local, worldT);
      accumulateMeshBounds(bounds, transformed.faces);
    }
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

function transformedIndexedMeshBounds(positions: Float32Array, transform: Transform): { min: [number, number, number]; max: [number, number, number] } {
  const d = transform.decomposeToTranslateAndRotate();
  const axis = d.rotateAxis, len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const x = axis[0] / len, y = axis[1] / len, z = axis[2] / len;
  const c = Math.cos(d.rotateDeg * Math.PI / 180), s = Math.sin(d.rotateDeg * Math.PI / 180);
  const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    const px = positions[i]!, py = positions[i + 1]!, pz = positions[i + 2]!;
    const dot = x * px + y * py + z * pz;
    const q: [number, number, number] = [px * c + (y * pz - z * py) * s + x * dot * (1 - c) + d.translate[0], py * c + (z * px - x * pz) * s + y * dot * (1 - c) + d.translate[1], pz * c + (x * py - y * px) * s + z * dot * (1 - c) + d.translate[2]];
    for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], q[a]); max[a] = Math.max(max[a], q[a]); }
  }
  return { min, max };
}

/** Selection ↔ code link data of one part mesh (see `featureOwnership.ts`). */
type PartLinkData = FeatureOwnership & { edgeRanges?: number[]; edgeStableIds?: string[] };
type CachedScenePartMesh = { shape: ShapeBackend; faces: FaceGeometry[]; volume?: number; solidCount?: number; edges?: Float32Array; link?: PartLinkData };
type ScenePartMeshCache = Map<string, CachedScenePartMesh>;

interface ResolvedScenePartMesh {
  faces: FaceGeometry[];
  mesh?: { positions: Float32Array; normals: Float32Array; indices: Uint32Array };
  volume: number | undefined;
  solidCount: number | undefined;
  edges: Float32Array | undefined;
  link: PartLinkData;
  fromCache: boolean;
  partCache: ScenePartMeshCache | undefined;
}

/** Per-face / per-edge owners of one part mesh. The part's shape is the
 *  lowered shape of its `assemblyPart` record, whose owner map was recorded
 *  when that record compiled, so the faces inherit their creating calls. */
function partLinkData(
  part: SceneBackendPart,
  rawShape: unknown,
  meshed: { edgeRanges?: number[]; edgeHashes?: number[]; edgeStableIds?: string[] },
  ctx: SceneFanoutCtx,
): PartLinkData {
  const edgeRanges = meshed.edgeRanges !== undefined ? {
    edgeRanges: meshed.edgeRanges,
    ...(meshed.edgeStableIds !== undefined ? { edgeStableIds: meshed.edgeStableIds } : {}),
  } : {};
  const ownerId = ctx.ownerIdOfShape?.(part.shape);
  if (ownerId === undefined || ctx.recordOrder === undefined) return edgeRanges;
  return {
    ...edgeRanges,
    ...computeFeatureOwnership({
      featureId: ownerId,
      shape: part.shape,
      rawShape,
      predecessorShapes: [part.shape],
      edgeHashes: meshed.edgeHashes,
      recordOrder: ctx.recordOrder,
    }),
  };
}

function solidCountOf(shape: ShapeBackend): number | undefined {
  try {
    return shape.solidComponents().length;
  } catch {
    return undefined;
  }
}

/** Resolve one assembly part's mesh, reusing (and populating) the pose cache. */
function resolveScenePartMesh(
  featureId: FeatureId,
  part: SceneBackendPart,
  partCache: ScenePartMeshCache | undefined,
  ctx: SceneFanoutCtx,
): ResolvedScenePartMesh | undefined {
  // Pose-cache fast path: when the assembly is being re-lowered for a
  // pose-only edit, the per-part LOCAL shape is unchanged (same OCCT
  // backend instance is reused via the engine's seedShapes seed) and
  // only `part.worldTransform` has refreshed. Reuse cached triangle
  // data so we skip the expensive `meshShape()` call per part.
  const cachedPart = partCache?.get(part.name);
  if (cachedPart?.shape === part.shape) {
    return {
      faces: cachedPart.faces,
      volume: cachedPart.volume,
      solidCount: cachedPart.solidCount ?? solidCountOf(part.shape),
      edges: cachedPart.edges,
      link: cachedPart.link ?? {},
      fromCache: true,
      partCache,
    };
  }
  if (isDisplayMeshBackend(part.shape)) {
    const mesh = part.shape.getMesh();
    return { faces: [], mesh, volume: undefined, solidCount: undefined, edges: undefined, link: {}, fromCache: false, partCache };
  }
  const rawShape = ctx.extractRawShape(part.shape);
  const meshed = meshShape(rawShape, ctx.previewMeshOptions);
  if (!meshed) {
    // Per-part shape failed to mesh. Skip THIS part — the lowerer
    // already populated the part shape, and a single bad part must
    // not sink an otherwise-renderable assembly. Surface a soft
    // warning so the skip is not silently lost; the post-loop check
    // below escalates to a hard failure only when EVERY part skips.
    console.warn(
      `meshFeaturesPerFeature: assembly '${featureId}' part '${part.name}' compiled but produced no mesh — skipping part`,
    );
    return undefined;
  }
  const faces = meshed.faces;
  const volume = meshed.volume;
  const solidCount = solidCountOf(part.shape);
  const edges = meshed.edges;
  const link = partLinkData(part, rawShape, meshed, ctx);
  let nextCache = partCache;
  // Preview (coarse) meshes are never cached: the part cache is display-tier
  // and a coarse entry would satisfy the next display pass as-is.
  if (!ctx.previewMeshOptions && ctx.cachedAssemblyPartMeshes !== undefined) {
    if (!nextCache) {
      nextCache = new Map();
      ctx.cachedAssemblyPartMeshes.set(featureId, nextCache);
    }
      nextCache.set(part.name, {
        shape: part.shape,
        faces,
        ...(volume !== undefined ? { volume } : {}),
        ...(solidCount !== undefined ? { solidCount } : {}),
        ...(edges ? { edges } : {}),
        link,
      });
  }
  return { faces, volume, solidCount, edges, link, fromCache: false, partCache: nextCache };
}

function isDisplayMeshBackend(
  shape: ShapeBackend,
): shape is ShapeBackend & { getMesh: () => { positions: Float32Array; normals: Float32Array; indices: Uint32Array } } {
  const candidate = shape as ShapeBackend & { positions?: unknown; indices?: unknown; getMesh?: unknown };
  return candidate.target === 'export-occt'
    && candidate.positions instanceof Float32Array
    && candidate.indices instanceof Uint32Array
    && typeof candidate.getMesh === 'function';
}

/** Build + emit one assembly part's FeatureMesh; returns the local mesh and
 *  its world transform for the caller's bounds accumulation. */
function emitScenePartMesh(
  featureId: FeatureId,
  featureKind: FeatureKind,
  part: SceneBackendPart,
  resolved: ResolvedScenePartMesh,
  ctx: SceneFanoutCtx,
): { local: FeatureMesh; worldT: Transform } {
  const local: FeatureMesh = {
    featureId: `${featureId}__${part.name}`,
    featureKind: featureKind,
    predecessors: [featureId],
    // op intentionally omitted (no boolean op for assembly parts)
    faces: resolved.faces,
    ...(resolved.mesh ? { mesh: resolved.mesh } : {}),
    ...(resolved.volume !== undefined ? { volume: resolved.volume } : {}),
    ...(resolved.solidCount !== undefined ? { solidCount: resolved.solidCount } : {}),
    ...(resolved.edges ? { edges: resolved.edges } : {}),
    ...resolved.link,
  };
  if (!resolved.fromCache) {
    attachMaterialUVs(local.faces, part.material);
    ctx.attachPlanarUVs(local.faces);
  }
  const extra = ctx.explodeOffsets?.get(part.name);
  const worldT = extra !== undefined
    ? Transform.translation(extra[0], extra[1], extra[2]).compose(part.worldTransform)
    : part.worldTransform;
  ctx.emitFeature({
    ...local,
    assemblyFeatureId: featureId,
    assemblyPartName: part.name,
    transform: worldT.toMat4(),
    ...ctx.meshIdentityFields({
      featureId: local.featureId,
      featureKind: local.featureKind,
      assemblyFeatureId: featureId,
      assemblyPartName: part.name,
      sourceMetadataName: ctx.metadataNameOf(ctx.recordById.get(featureId)),
    }),
    ...(part.color !== undefined ? { color: part.color } : {}),
    ...(part.material !== undefined ? { material: part.material } : {}),
  });
  return { local, worldT };
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
        solidCount: 0,
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

/**
 * Shapes the session already lowered for exactly these inputs, for records
 * that `deriveSeedShapes` did not seed (no cached mesh yet). The meshing pass
 * meshes them instead of lowering them again — on a first mesh after
 * `buildModel`, or after `params.update`, that second lower used to repeat
 * every non-assembly record.
 *
 * Conservative by construction; any doubt seeds nothing (a full lower, the old
 * behaviour):
 *  - the shapes come from `reusableLoweredPrefix()`, which is empty unless the
 *    session's last full lower was taken under the current param table, gates
 *    and record ids / transform counts;
 *  - the records passed in must be the session's own record objects, and the
 *    param table (when given) the session's own table, so a caller meshing a
 *    different record list or param table never sees these shapes;
 *  - only B-rep, mesh and scene backends are reused (the kinds this pass
 *    meshes from a lowered shape).
 */
export function deriveFreshLoweredSeeds(
  records: readonly FeatureRecord[],
  paramTable: unknown,
  session: FreshLowerSession | undefined,
  alreadySeeded: ReadonlyMap<FeatureId, ShapeBackend> | undefined,
): Map<FeatureId, ShapeBackend> {
  const out = new Map<FeatureId, ShapeBackend>();
  if (!session?.reusableLoweredPrefix || !session.getRecords) return out;
  if (paramTable !== undefined && paramTable !== session.paramTable) return out;
  const own = new Set(session.getRecords());
  const fresh = session.reusableLoweredPrefix();
  if (fresh.size === 0) return out;
  for (const r of records) {
    if (alreadySeeded?.has(r.id)) continue;
    if (!own.has(r)) continue;
    const shape = fresh.get(r.id);
    if (shape === undefined) continue;
    if (!(shape instanceof OcctBackend) && !(shape instanceof MeshBackend) && !isSceneBackend(shape)) continue;
    out.set(r.id, shape);
  }
  return out;
}

/** The session hooks {@link deriveFreshLoweredSeeds} reads (a CaptureSession
 *  provides all three). */
export interface FreshLowerSession {
  /** Validated shapes of the last full lower (`CaptureSession.reusableLoweredPrefix`). */
  reusableLoweredPrefix?: () => ReadonlyMap<FeatureId, ShapeBackend>;
  getRecords?: () => readonly FeatureRecord[];
  paramTable?: unknown;
}

/** {@link deriveFreshLoweredSeeds}, plus the full seed map for the engine run
 *  (`seedShapes` and the fresh shapes together). */
export function planFreshLoweredSeeds(
  records: readonly FeatureRecord[],
  paramTable: unknown,
  session: FreshLowerSession | undefined,
  seedShapes: ReadonlyMap<FeatureId, ShapeBackend> | undefined,
): { meshFromSeed: Map<FeatureId, ShapeBackend>; engineSeeds: Map<FeatureId, ShapeBackend> | undefined } {
  const meshFromSeed = deriveFreshLoweredSeeds(records, paramTable, session, seedShapes);
  return { meshFromSeed, engineSeeds: mergeSeeds(seedShapes, meshFromSeed) };
}

/**
 * Drop the triangulation that meshing a borrowed session shape left on it, so
 * the session's shape is in the same state as before the pass (OCCT's
 * `Bnd_Box` tightens to a cached triangulation, and the triangulation holds
 * memory). Best effort; mesh backends carry none.
 */
export function releaseBorrowedTriangulation(shape: ShapeBackend): void {
  if (isSceneBackend(shape)) {
    for (const part of shape.parts) releaseBorrowedTriangulation(part.shape);
    return;
  }
  if (!(shape instanceof OcctBackend)) return;
  clearTriangulation(shape.getReplicadShape());
}

/** `seedShapes` plus `extra`, without mutating either. */
export function mergeSeeds(
  seedShapes: ReadonlyMap<FeatureId, ShapeBackend> | undefined,
  extra: ReadonlyMap<FeatureId, ShapeBackend>,
): Map<FeatureId, ShapeBackend> | undefined {
  if (extra.size === 0) return seedShapes === undefined ? undefined : new Map(seedShapes);
  const merged = new Map<FeatureId, ShapeBackend>(seedShapes ?? []);
  for (const [id, shape] of extra) merged.set(id, shape);
  return merged;
}

// Records whose lowered shape was passed in `seedShapes` are skipped by the
// recompute engine — `feature.compiled` is NOT emitted for them, so the
// onEvent path never runs. Re-emit cached `FeatureMesh` entries for
// non-construction-closure records here so the response still carries
// those records' meshes. Construction-closure records emit only via the
// assembly fan-out, so they don't need a re-emit here.
//
// A cached entry marked `coarse` (a preview-pass first paint) is handed to
// `refineSeeded` instead: the refiner re-meshes the record's already-lowered
// seeded shape at the current pass's quality and emits + re-caches the result.
// Without a refiner a coarse entry falls back to a plain re-emit, so a
// feature is never missing from the payload.
export function reEmitSeededFeatureMeshes(
  records: readonly FeatureRecord[],
  seedShapes: ReadonlyMap<FeatureId, ShapeBackend> | undefined,
  cachedFeatureMeshes: Map<FeatureId, FeatureMesh> | undefined,
  constructionClosure: ReadonlySet<FeatureId>,
  features: readonly FeatureMesh[],
  emitFeature: (mesh: FeatureMesh) => void,
  meshBounds: MeshBoundsAccumulator,
  refineSeeded?: (record: FeatureRecord, seededShape: ShapeBackend) => void,
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
    if (refineSeeded && isCoarseMesh(mesh)) {
      refineSeeded(r, seedShapes.get(r.id)!);
      continue;
    }
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

/** Final phase of `meshFeaturesPerFeature`: bounds, shadowing diagnostics
 *  (logged in order), result object. Kept beside the other phase helpers. */
export function finishMeshFeatures(
  features: FeatureMesh[],
  meshBounds: MeshBoundsAccumulator,
  failedFeatureIds: FeatureId[],
  explicitMaterialByFeatureId: ReadonlyMap<FeatureId, PBRMaterial>,
  colorByFeatureId: ReadonlyMap<FeatureId, string>,
  warnings: PerFaceMaterialWarning[],
  shapes: ReadonlyMap<FeatureId, ShapeBackend>,
): MeshFeaturesResult {
  const bounds = buildMeshBounds(features, meshBounds);
  const consumed = new Set(features.flatMap((feature) => feature.predecessors));
  // Scene fan-out meshes use composite ids (`sceneId__partName`) while
  // assemblyExport consumes the Scene feature id. When an export exists,
  // its root mesh already represents those parts; don't count both forms.
  const exportedScenes = new Set(
    features
      .filter((feature) => feature.featureKind === 'assemblyExport')
      .flatMap((feature) => feature.predecessors),
  );
  const terminalFeatures = features.filter((feature) =>
    !consumed.has(feature.featureId)
    && !(feature.assemblyFeatureId !== undefined && exportedScenes.has(feature.assemblyFeatureId)),
  );
  const solidCount = terminalFeatures.every((feature) => feature.solidCount !== undefined)
    ? terminalFeatures.reduce((count, feature) => count + (feature.solidCount ?? 0), 0)
    : undefined;
  const { materialShadowingWarnings, colorShadowingWarnings } = collectShadowingWarnings(
    features,
    explicitMaterialByFeatureId,
    colorByFeatureId,
  );
  for (const w of materialShadowingWarnings) {
    console.warn(`meshFeaturesPerFeature: material shadowing — ${w.message}`);
  }
  for (const w of colorShadowingWarnings) {
    console.warn(`meshFeaturesPerFeature: color shadowing — ${w.message}`);
  }
  return {
    features,
    bounds,
    ...(solidCount !== undefined ? { solidCount } : {}),
    failedFeatureIds,
    materialShadowingWarnings,
    colorShadowingWarnings,
    shapes,
    ...(warnings.length > 0 ? { perFaceMaterialWarnings: warnings } : {}),
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
  seedAssemblyConstructionNodes(records, closure);

  // Walk upstream from each assemblyPart's source shape, visiting all
  // feature-kind input refs transitively. Any record that contributes to
  // the BUILD of an assembly part is construction debris from the
  // renderer's perspective.
  const queue = seedConstructionQueue(records);

  walkConstructionClosure(queue, recordById, closure);

  return closure;
}

/** Seed `closure` with assembly construction-node IDs. */
function seedAssemblyConstructionNodes(
  records: readonly FeatureRecord[],
  closure: Set<FeatureId>,
): void {
  for (const r of records) {
    if (
      r.kind === 'assemblyPart' ||
      r.kind === 'assemblyJoint' ||
      r.kind === 'assemblyConnect'
    ) {
      closure.add(r.id);
    }
  }
}

/** Collect each assemblyPart's source-shape ref as the upstream walk seeds. */
function seedConstructionQueue(records: readonly FeatureRecord[]): FeatureId[] {
  const queue: FeatureId[] = [];
  for (const r of records) {
    if (r.kind !== 'assemblyPart') continue;
    const shapeRef = r.inputs.shape as FeatureRef | undefined;
    if (shapeRef && shapeRef.kind === 'feature') queue.push(shapeRef.id);
  }
  return queue;
}

/** Walk upstream from the seeded queue, following all feature-kind input
 *  refs transitively. */
function walkConstructionClosure(
  queue: FeatureId[],
  recordById: ReadonlyMap<FeatureId, FeatureRecord>,
  closure: Set<FeatureId>,
): void {
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (closure.has(id)) continue;
    closure.add(id);
    const record = recordById.get(id);
    if (record === undefined) continue;
    // A tube is built from nothing: its inputs name the trunk it branches off,
    // a tube of its own, not geometry this one was constructed from.
    if (record.kind === 'tube') continue;
    for (const value of Object.values(record.inputs)) {
      // Follow plain feature refs only. face/edge/vertex refs reference
      // geometry on a feature already covered via base/target.
      if (value && (value as FeatureRef).kind === 'feature') {
        queue.push((value as { id: FeatureId }).id);
      }
    }
  }
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

  const descendantsByPredecessor = buildShadowDescendantIndex(features);

  const out: AttributeShadowingWarning[] = [];
  for (const leaf of features) {
    if (leaf.virtual) continue;
    if (!attributeByFeatureId.has(leaf.featureId)) continue;

    const shadower = findShadowingFeature(
      leaf.featureId,
      attributeByFeatureId,
      descendantsByPredecessor,
      featureById,
    );
    if (shadower) {
      out.push(attributeShadowingWarning(attribute, leaf, shadower));
    }
  }

  return out;
}

/** Reverse adjacency for fuse-style edges only. A leaf at `id` flows into
 *  `descendantsByPredecessor.get(id)` when those descendants list it as a
 *  predecessor AND the descendant's op is union/intersect (or no-op, for
 *  non-boolean records that just consume the shape — modifiers/transforms
 *  preserve material reachability). */
function buildShadowDescendantIndex(
  features: readonly FeatureMesh[],
): Map<FeatureId, FeatureId[]> {
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
  return descendantsByPredecessor;
}

/** BFS forward from `leafId`; stop at the first attributed descendant on each
 *  branch. We only need one shadower per leaf for the diagnostic; if there's a
 *  chain (.union().union().union()), the FIRST one with its own attribution is
 *  the load-bearing one. */
function findShadowingFeature(
  leafId: FeatureId,
  attributeByFeatureId: ReadonlyMap<FeatureId, PBRMaterial | string>,
  descendantsByPredecessor: ReadonlyMap<FeatureId, FeatureId[]>,
  featureById: ReadonlyMap<FeatureId, FeatureMesh>,
): FeatureMesh | undefined {
  const visited = new Set<FeatureId>([leafId]);
  const queue: FeatureId[] = [];
  const seedDescendants = descendantsByPredecessor.get(leafId);
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
  return shadower;
}

/** Build the structured warning for one (leaf, shadowing record) pair. */
function attributeShadowingWarning(
  attribute: ShadowedAttribute,
  leaf: FeatureMesh,
  shadower: FeatureMesh,
): AttributeShadowingWarning {
  return {
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
  };
}
