// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/featureMeshingPhases.ts
//
// Phase helpers extracted verbatim out of `meshFeaturesPerFeature`'s
// `onEvent` handler in featureMeshing.ts, to keep that closure's cyclomatic
// complexity under the quality-ratchet gate. Code moved here unchanged;
// only free variables (`minX`/`maxX`/… → a shared `bounds` accumulator,
// `event.featureId` → explicit params) were threaded through.
import type { FeatureId, FeatureKind } from '../../shared/intent/types';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FaceGeometry } from '../../shared/worker/workerTypes';
import type { PBRMaterial } from '../../shared/intent/material';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { meshShape } from '../../kernel/backends/occt/meshing';
import { resolveFaceLabelToFace } from '../../kernel/backends/occt/edgeSelection';
import { faceHashOf } from '../../kernel/backends/occt/createdRefs';
import { transformFeatureMesh } from './transformMesh';
import { Transform } from '../../shared/runtime/se3';
import type { FeatureMesh } from './featureMeshing';

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

export interface PerFaceMaterialWarning {
  code: 'feature.material.face-label-no-match';
  featureId: FeatureId;
  label: string;
  detail: string;
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
