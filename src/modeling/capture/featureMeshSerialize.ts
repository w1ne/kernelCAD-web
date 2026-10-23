// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/featureMeshSerialize.ts
import type { FeatureMesh } from './featureMeshing';
import type { FaceGeometry } from '../../shared/worker/workerTypes';
import type { PBRMaterial } from '../../shared/intent/material';
import type { ReferenceImageMetadata } from '../../shared/intent/referenceImageRecord';
import type { RenderEnvironmentMetadata } from '../../shared/intent/renderEnvironmentRecord';
import type { CameraTargetMetadata } from '../../shared/intent/cameraTargetRecord';

/** JSON carries plain arrays. The Studio's rebuild worker packs them into
 *  typed arrays off the UI thread before handing the payload over. */
export type SerializedFloats = number[] | Float32Array;
export type SerializedIndices = number[] | Uint32Array;

export interface FaceGeometrySerialized {
  vertices: SerializedFloats;
  indices: SerializedIndices;
  normals: SerializedFloats;
  /** Bbox-planar UVs (one (u,v) per vertex). */
  uv?: SerializedFloats;
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
  mesh?: { positions: SerializedFloats; normals: SerializedFloats; indices: SerializedIndices };
  volume?: number;
  edges?: SerializedFloats;
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

type FloatOut = (values: Float32Array) => SerializedFloats;
type IndexOut = (values: Uint32Array) => SerializedIndices;

function arrayWriters(typedArrayCopies: boolean): { floats: FloatOut; indices: IndexOut } {
  if (typedArrayCopies) return { floats: (v) => v.slice(), indices: (v) => v.slice() };
  return { floats: (v) => Array.from(v), indices: (v) => Array.from(v) };
}

function serializeIndexedMesh(
  mesh: FeatureMesh['mesh'],
  out: { floats: FloatOut; indices: IndexOut },
): Pick<FeatureMeshSerialized, 'mesh'> {
  if (!mesh) return {};
  return { mesh: { positions: out.floats(mesh.positions), normals: out.floats(mesh.normals), indices: out.indices(mesh.indices) } };
}

/** Already-packed arrays (rebuild worker) are adopted without a copy; plain
 *  arrays convert exactly as before, so the values are identical either way. */
function asFloat32(values: SerializedFloats): Float32Array {
  return values instanceof Float32Array ? values : new Float32Array(values);
}

function asUint32(values: SerializedIndices): Uint32Array {
  return values instanceof Uint32Array ? values : new Uint32Array(values);
}

function rehydrateIndexedMesh(mesh: FeatureMeshSerialized['mesh']): Pick<FeatureMesh, 'mesh'> {
  if (!mesh) return {};
  return { mesh: { positions: asFloat32(mesh.positions), normals: asFloat32(mesh.normals), indices: asUint32(mesh.indices) } };
}

export function serializeForBridge(m: FeatureMesh): FeatureMeshSerialized {
  return serializeFeatureMesh(m, false);
}

/** `serializeForBridge` with typed-array COPIES instead of plain arrays: a
 *  browser worker transfers them without detaching the buffers its own mesh
 *  cache still holds. The values are identical. */
export function serializeForTransfer(m: FeatureMesh): FeatureMeshSerialized {
  return serializeFeatureMesh(m, true);
}

function serializeFeatureMesh(m: FeatureMesh, typedArrayCopies: boolean): FeatureMeshSerialized {
  const out = arrayWriters(typedArrayCopies);
  return {
    featureId: m.featureId,
    featureKind: m.featureKind,
    predecessors: [...m.predecessors],
    op: m.op,
    faces: m.faces.map((f) => ({
      vertices: out.floats(f.vertices),
      indices: out.indices(f.indices),
      normals: out.floats(f.normals),
      ...(f.uv !== undefined ? { uv: out.floats(f.uv) } : {}),
      faceId: f.faceId,
      plane: f.plane,
      cylinder: f.cylinder,
    })),
    ...serializeIndexedMesh(m.mesh, out),
    volume: m.volume,
    edges: m.edges ? out.floats(m.edges) : undefined,
    ...(m.color !== undefined ? { color: m.color } : {}),
    ...(m.material !== undefined ? { material: m.material } : {}),
    ...(m.materialByFaceId !== undefined ? { materialByFaceId: m.materialByFaceId } : {}),
    ...copyLinkFields(m),
    ...(m.displayName !== undefined ? { displayName: m.displayName } : {}),
    ...(m.filterNames !== undefined ? { filterNames: [...m.filterNames] } : {}),
    ...(m.sourceMetadataName !== undefined ? { sourceMetadataName: m.sourceMetadataName } : {}),
    ...(m.assemblyFeatureId !== undefined ? { assemblyFeatureId: m.assemblyFeatureId } : {}),
    ...(m.assemblyPartName !== undefined ? { assemblyPartName: m.assemblyPartName } : {}),
    ...(m.transform !== undefined ? { transform: Array.from(m.transform) } : {}),
    ...(m.virtual === true ? { virtual: true } : {}),
    ...(m.referenceImage !== undefined ? { referenceImage: m.referenceImage } : {}),
    ...(m.renderEnvironment !== undefined ? { renderEnvironment: m.renderEnvironment } : {}),
    ...(m.cameraTarget !== undefined ? { cameraTarget: m.cameraTarget } : {}),
  };
}

export function rehydrateFromBridge(s: FeatureMeshSerialized): FeatureMesh {
  return {
    featureId: s.featureId as FeatureMesh['featureId'],
    featureKind: s.featureKind as FeatureMesh['featureKind'],
    predecessors: [...s.predecessors] as FeatureMesh['predecessors'],
    op: s.op,
    faces: s.faces.map((f) => ({
      vertices: asFloat32(f.vertices),
      indices: asUint32(f.indices),
      normals: asFloat32(f.normals),
      ...(f.uv !== undefined ? { uv: asFloat32(f.uv) } : {}),
      faceId: f.faceId,
      plane: f.plane,
      cylinder: f.cylinder,
    })),
    ...rehydrateIndexedMesh(s.mesh),
    volume: s.volume,
    edges: s.edges ? asFloat32(s.edges) : undefined,
    ...(s.color !== undefined ? { color: s.color } : {}),
    ...(s.material !== undefined ? { material: s.material } : {}),
    ...(s.materialByFaceId !== undefined ? { materialByFaceId: s.materialByFaceId } : {}),
    ...copyLinkFields(s),
    ...(s.displayName !== undefined ? { displayName: s.displayName } : {}),
    ...(s.filterNames !== undefined ? { filterNames: [...s.filterNames] } : {}),
    ...(s.sourceMetadataName !== undefined ? { sourceMetadataName: s.sourceMetadataName } : {}),
    ...(s.assemblyFeatureId !== undefined ? { assemblyFeatureId: s.assemblyFeatureId as FeatureMesh['featureId'] } : {}),
    ...(s.assemblyPartName !== undefined ? { assemblyPartName: s.assemblyPartName } : {}),
    ...(s.transform !== undefined ? { transform: [...s.transform] } : {}),
    ...(s.virtual === true ? { virtual: true } : {}),
    ...(s.referenceImage !== undefined ? { referenceImage: s.referenceImage } : {}),
    ...(s.renderEnvironment !== undefined ? { renderEnvironment: s.renderEnvironment } : {}),
    ...(s.cameraTarget !== undefined ? { cameraTarget: s.cameraTarget } : {}),
  };
}
