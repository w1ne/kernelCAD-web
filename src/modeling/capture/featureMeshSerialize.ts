// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/featureMeshSerialize.ts
import type { FeatureMesh } from './featureMeshing';
import type { FaceGeometry } from '../../shared/worker/workerTypes';
import type { PBRMaterial } from '../../shared/intent/material';
import type { ReferenceImageMetadata } from '../../shared/intent/referenceImageRecord';
import type { RenderEnvironmentMetadata } from '../../shared/intent/renderEnvironmentRecord';
import type { CameraTargetMetadata } from '../../shared/intent/cameraTargetRecord';

export interface FaceGeometrySerialized {
  vertices: number[];
  indices: number[];
  normals: number[];
  /** Bbox-planar UVs (one (u,v) per vertex). */
  uv?: number[];
  faceId: number;
  plane?: FaceGeometry['plane'];
  cylinder?: FaceGeometry['cylinder'];
}

export interface FeatureMeshSerialized {
  featureId: string;
  /** Widened from FeatureKind union to plain string to survive JSON across the
   *  Playwright bridge. The cast in rehydrateFromBridge re-asserts the union;
   *  a malformed payload would silently produce a wrong-typed FeatureMesh. */
  featureKind: string;
  predecessors: string[];
  op?: 'subtract' | 'union' | 'intersect';
  faces: FaceGeometrySerialized[];
  volume?: number;
  edges?: number[];
  /** Legacy color attribute (ColorToken or `#rrggbb` hex). Renderer resolves via
   *  ROLE_PALETTE; absent means use the renderer's default material color.
   *  Prefer `material` when present — it carries full PBR data. */
  color?: string;
  /** Full PBR material derived from FeatureRecord.metadata.material (or promoted
   *  from metadata.color). The renderer (Task 8+) reads this in preference to
   *  the legacy `color` string field. */
  material?: PBRMaterial;
  /** Per-face PBR materials keyed by the integer `faceId`. Populated when
   *  `FeatureRecord.metadata.materialByLabel` resolves at least one label
   *  against the meshed shape. The renderer prefers this entry over `material`
   *  on a face-by-face basis. */
  materialByFaceId?: Record<number, PBRMaterial>;
  /** Owning feature id per face index. See `FeatureMesh.faceOwners`. */
  faceOwners?: string[];
  /** Per-edge `[start, count]` vertex ranges into `edges`. */
  edgeRanges?: number[];
  /** Owning feature id per `edgeRanges` pair. */
  edgeOwners?: string[];
  /** Stable human-readable mesh label for manifests and object filters. */
  displayName?: string;
  /** Deterministic names/ids that can match this mesh in inspection filters. */
  filterNames?: string[];
  /** Original FeatureRecord.metadata.name when authored on the source record. */
  sourceMetadataName?: string;
  /** Assembly feature id when this mesh is a SceneBackend part fan-out. */
  assemblyFeatureId?: string;
  /** Assembly part name when this mesh is a SceneBackend part fan-out. */
  assemblyPartName?: string;
  /** Geometry identity of an assembly part mesh; see FeatureMesh.geometryId. */
  geometryId?: string;
  /** Column-major 4x4 local-to-world transform for viewport-side posing. */
  transform?: number[];
  /** True for virtual (non-geometry) records such as referenceImage. */
  virtual?: boolean;
  /** Reference image payload; present when featureKind === 'referenceImage'. */
  referenceImage?: ReferenceImageMetadata;
  /** Render-environment payload; present when featureKind === 'renderEnvironment'. */
  renderEnvironment?: RenderEnvironmentMetadata;
  /** Camera-target payload; present when featureKind === 'cameraTarget'. */
  cameraTarget?: CameraTargetMetadata;
}

type LinkFields = Pick<FeatureMeshSerialized, 'faceOwners' | 'edgeRanges' | 'edgeOwners'>;

/** Selection ↔ code link fields: plain arrays on both sides of the bridge. */
function copyLinkFields(m: LinkFields): LinkFields {
  return {
    ...(m.faceOwners !== undefined ? { faceOwners: [...m.faceOwners] } : {}),
    ...(m.edgeRanges !== undefined ? { edgeRanges: [...m.edgeRanges] } : {}),
    ...(m.edgeOwners !== undefined ? { edgeOwners: [...m.edgeOwners] } : {}),
  };
}

type GeometryFields = Pick<FeatureMeshSerialized, 'faces' | 'volume' | 'edges' | 'faceOwners' | 'edgeRanges' | 'edgeOwners'>;

function serializeGeometry(m: FeatureMesh): GeometryFields {
  return {
    faces: m.faces.map((f) => ({
      vertices: Array.from(f.vertices),
      indices: Array.from(f.indices),
      normals: Array.from(f.normals),
      ...(f.uv !== undefined ? { uv: Array.from(f.uv) } : {}),
      faceId: f.faceId,
      plane: f.plane,
      cylinder: f.cylinder,
    })),
    volume: m.volume,
    edges: m.edges ? Array.from(m.edges) : undefined,
    ...copyLinkFields(m),
  };
}

function serializeHeader(m: FeatureMesh): Omit<FeatureMeshSerialized, keyof GeometryFields> {
  return {
    featureId: m.featureId,
    featureKind: m.featureKind,
    predecessors: [...m.predecessors],
    op: m.op,
    ...(m.color !== undefined ? { color: m.color } : {}),
    ...(m.material !== undefined ? { material: m.material } : {}),
    ...(m.materialByFaceId !== undefined ? { materialByFaceId: m.materialByFaceId } : {}),
    ...(m.displayName !== undefined ? { displayName: m.displayName } : {}),
    ...(m.filterNames !== undefined ? { filterNames: [...m.filterNames] } : {}),
    ...(m.sourceMetadataName !== undefined ? { sourceMetadataName: m.sourceMetadataName } : {}),
    ...(m.assemblyFeatureId !== undefined ? { assemblyFeatureId: m.assemblyFeatureId } : {}),
    ...(m.assemblyPartName !== undefined ? { assemblyPartName: m.assemblyPartName } : {}),
    ...(m.geometryId !== undefined ? { geometryId: m.geometryId } : {}),
    ...(m.transform !== undefined ? { transform: Array.from(m.transform) } : {}),
    ...(m.virtual === true ? { virtual: true } : {}),
    ...(m.referenceImage !== undefined ? { referenceImage: m.referenceImage } : {}),
    ...(m.renderEnvironment !== undefined ? { renderEnvironment: m.renderEnvironment } : {}),
    ...(m.cameraTarget !== undefined ? { cameraTarget: m.cameraTarget } : {}),
  };
}

export function serializeForBridge(m: FeatureMesh): FeatureMeshSerialized {
  return { ...serializeHeader(m), ...serializeGeometry(m) };
}

type RehydratedGeometry = Pick<FeatureMesh, 'faces' | 'volume' | 'edges' | 'faceOwners' | 'edgeRanges' | 'edgeOwners'>;

function rehydrateGeometry(g: SharedGeometrySerialized): RehydratedGeometry {
  return {
    faces: g.faces.map((f) => ({
      vertices: new Float32Array(f.vertices),
      indices: new Uint32Array(f.indices),
      normals: new Float32Array(f.normals),
      ...(f.uv !== undefined ? { uv: new Float32Array(f.uv) } : {}),
      faceId: f.faceId,
      plane: f.plane,
      cylinder: f.cylinder,
    })),
    volume: g.volume,
    edges: g.edges ? new Float32Array(g.edges) : undefined,
    ...copyLinkFields(g),
  };
}

function rehydrateHeader(s: FeatureMeshSerialized): Omit<FeatureMesh, keyof RehydratedGeometry> {
  return {
    featureId: s.featureId as FeatureMesh['featureId'],
    featureKind: s.featureKind as FeatureMesh['featureKind'],
    predecessors: [...s.predecessors] as FeatureMesh['predecessors'],
    op: s.op,
    ...(s.color !== undefined ? { color: s.color } : {}),
    ...(s.material !== undefined ? { material: s.material } : {}),
    ...(s.materialByFaceId !== undefined ? { materialByFaceId: s.materialByFaceId } : {}),
    ...(s.displayName !== undefined ? { displayName: s.displayName } : {}),
    ...(s.filterNames !== undefined ? { filterNames: [...s.filterNames] } : {}),
    ...(s.sourceMetadataName !== undefined ? { sourceMetadataName: s.sourceMetadataName } : {}),
    ...(s.assemblyFeatureId !== undefined ? { assemblyFeatureId: s.assemblyFeatureId as FeatureMesh['featureId'] } : {}),
    ...(s.assemblyPartName !== undefined ? { assemblyPartName: s.assemblyPartName } : {}),
    ...(s.geometryId !== undefined ? { geometryId: s.geometryId } : {}),
    ...(s.transform !== undefined ? { transform: [...s.transform] } : {}),
    ...(s.virtual === true ? { virtual: true } : {}),
    ...(s.referenceImage !== undefined ? { referenceImage: s.referenceImage } : {}),
    ...(s.renderEnvironment !== undefined ? { renderEnvironment: s.renderEnvironment } : {}),
    ...(s.cameraTarget !== undefined ? { cameraTarget: s.cameraTarget } : {}),
  };
}

export function rehydrateFromBridge(s: FeatureMeshSerialized): FeatureMesh {
  return { ...rehydrateHeader(s), ...rehydrateGeometry(s) };
}

export interface SharedGeometrySerialized {
  faces: FaceGeometrySerialized[];
  volume?: number;
  edges?: number[];
  faceOwners?: string[];
  edgeRanges?: number[];
  edgeOwners?: string[];
}

/** Mesh-bridge payload. `geometries` is present only in the opt-in shared form. */
export interface FeatureMeshPayload {
  features: FeatureMeshSerialized[];
  geometries?: Record<string, SharedGeometrySerialized>;
}

export function serializeFeatureMeshes(
  meshes: readonly FeatureMesh[],
  opts: { shareGeometry?: boolean } = {},
): FeatureMeshPayload {
  if (opts.shareGeometry !== true) return { features: meshes.map(serializeForBridge) };
  const geometries: Record<string, SharedGeometrySerialized> = {};
  const features = meshes.map((m): FeatureMeshSerialized => {
    if (m.geometryId === undefined) return serializeForBridge(m);
    if (geometries[m.geometryId] === undefined) geometries[m.geometryId] = serializeGeometry(m);
    return { ...serializeHeader(m), faces: [] };
  });
  return Object.keys(geometries).length > 0 ? { features, geometries } : { features };
}

export function rehydrateFeatureMeshes(payload: FeatureMeshPayload): FeatureMesh[] {
  const byId = new Map<string, RehydratedGeometry>();
  return payload.features.map((s) => {
    const shared = s.geometryId === undefined ? undefined : payload.geometries?.[s.geometryId];
    if (shared === undefined || s.geometryId === undefined) return rehydrateFromBridge(s);
    let geometry = byId.get(s.geometryId);
    if (geometry === undefined) {
      geometry = rehydrateGeometry(shared);
      byId.set(s.geometryId, geometry);
    }
    return { ...rehydrateFromBridge(s), ...geometry };
  });
}
