// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/analysisMesh.ts
//
// The analysis tessellation behind `OcctBackend.getMesh()`.
//
// A whole-shape `BRepMesh_IncrementalMesh` builds its working model for
// every face before it meshes the first one, and frees it only at the end:
// about 28 KB of WASM heap per face on a shell of planar triangles. A
// 9k-face imported STL solid grew the heap by ~260 MB in one call, and the
// WASM heap never shrinks. Above the face limit each face is meshed on its
// own, so the working model stays one face large. An edge discretized for
// one face is reused for its neighbour, so the triangulation is the same.

import type * as replicad from 'replicad';
import { getOC } from 'replicad';
import type { RuntimeMesh } from '../runtimeMesh';

/** Faces above which the whole-shape mesher is not run. */
export const ANALYSIS_WHOLE_SHAPE_FACE_LIMIT = 1600;

export interface AnalysisMeshOptions {
  tolerance: number;
  /** Radians. */
  angularTolerance: number;
}

interface TriangulatedFace {
  vertices: number[];
  trianglesIndexes: number[];
  verticesNormals: number[];
}

function wholeShapeMesh(shape: replicad.Shape3D, options: AnalysisMeshOptions): RuntimeMesh {
  const meshed = shape.mesh(options);
  return {
    positions: new Float32Array(meshed.vertices),
    normals: new Float32Array(meshed.normals ?? new Array(meshed.vertices.length).fill(0)),
    indices: new Uint32Array(meshed.triangles),
  };
}

/** Same buffers as `wholeShapeMesh`, with one mesher run per face. */
function faceByFaceMesh(faces: readonly replicad.Face[], options: AnalysisMeshOptions): RuntimeMesh {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const parts: TriangulatedFace[] = [];
  let nodes = 0;
  let corners = 0;
  for (const face of faces) {
    // Same arguments as replicad's `_mesh`: absolute deflection, not parallel.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new oc.BRepMesh_IncrementalMesh_2((face as any).wrapped, options.tolerance, false, options.angularTolerance, false).delete();
    const tri = face.triangulation(nodes) as TriangulatedFace | null;
    if (!tri) continue;
    parts.push(tri);
    nodes += tri.vertices.length / 3;
    corners += tri.trianglesIndexes.length;
  }
  const positions = new Float32Array(nodes * 3);
  const normals = new Float32Array(nodes * 3);
  const indices = new Uint32Array(corners);
  let v = 0;
  let t = 0;
  for (const tri of parts) {
    positions.set(tri.vertices, v);
    normals.set(tri.verticesNormals, v);
    indices.set(tri.trianglesIndexes, t);
    v += tri.vertices.length;
    t += tri.trianglesIndexes.length;
  }
  return { positions, normals, indices };
}

export function analysisMesh(
  shape: replicad.Shape3D,
  options: AnalysisMeshOptions,
  wholeShapeFaceLimit = ANALYSIS_WHOLE_SHAPE_FACE_LIMIT,
): RuntimeMesh {
  const faces = shape.faces;
  if (faces.length <= wholeShapeFaceLimit) return wholeShapeMesh(shape, options);
  return faceByFaceMesh(faces, options);
}
