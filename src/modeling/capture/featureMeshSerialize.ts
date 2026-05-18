// src/modeling/capture/featureMeshSerialize.ts
import type { FeatureMesh } from './featureMeshing';
import type { FaceGeometry } from '../../shared/worker/workerTypes';
import type { PBRMaterial } from '../../shared/intent/material';
import type { ReferenceImageMetadata } from '../../shared/intent/referenceImageRecord';

export interface FaceGeometrySerialized {
  vertices: number[];
  indices: number[];
  normals: number[];
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
  /** True for virtual (non-geometry) records such as referenceImage. */
  virtual?: boolean;
  /** Reference image payload; present when featureKind === 'referenceImage'. */
  referenceImage?: ReferenceImageMetadata;
}

export function serializeForBridge(m: FeatureMesh): FeatureMeshSerialized {
  return {
    featureId: m.featureId,
    featureKind: m.featureKind,
    predecessors: [...m.predecessors],
    op: m.op,
    faces: m.faces.map((f) => ({
      vertices: Array.from(f.vertices),
      indices: Array.from(f.indices),
      normals: Array.from(f.normals),
      faceId: f.faceId,
      plane: f.plane,
      cylinder: f.cylinder,
    })),
    volume: m.volume,
    edges: m.edges ? Array.from(m.edges) : undefined,
    ...(m.color !== undefined ? { color: m.color } : {}),
    ...(m.material !== undefined ? { material: m.material } : {}),
    ...(m.materialByFaceId !== undefined ? { materialByFaceId: m.materialByFaceId } : {}),
    ...(m.virtual === true ? { virtual: true } : {}),
    ...(m.referenceImage !== undefined ? { referenceImage: m.referenceImage } : {}),
  };
}

export function rehydrateFromBridge(s: FeatureMeshSerialized): FeatureMesh {
  return {
    featureId: s.featureId as FeatureMesh['featureId'],
    featureKind: s.featureKind as FeatureMesh['featureKind'],
    predecessors: [...s.predecessors] as FeatureMesh['predecessors'],
    op: s.op,
    faces: s.faces.map((f) => ({
      vertices: new Float32Array(f.vertices),
      indices: new Uint32Array(f.indices),
      normals: new Float32Array(f.normals),
      faceId: f.faceId,
      plane: f.plane,
      cylinder: f.cylinder,
    })),
    volume: s.volume,
    edges: s.edges ? new Float32Array(s.edges) : undefined,
    ...(s.color !== undefined ? { color: s.color } : {}),
    ...(s.material !== undefined ? { material: s.material } : {}),
    ...(s.materialByFaceId !== undefined ? { materialByFaceId: s.materialByFaceId } : {}),
    ...(s.virtual === true ? { virtual: true } : {}),
    ...(s.referenceImage !== undefined ? { referenceImage: s.referenceImage } : {}),
  };
}
