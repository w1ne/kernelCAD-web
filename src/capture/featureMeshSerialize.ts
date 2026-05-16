// src/capture/featureMeshSerialize.ts
import type { FeatureMesh } from './featureMeshing';
import type { FaceGeometry } from '../shared/worker/workerTypes';

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
  /** Color attribute (ColorToken or `#rrggbb` hex). Renderer resolves via
   *  ROLE_PALETTE; absent means use the renderer's default material color. */
  color?: string;
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
  };
}
