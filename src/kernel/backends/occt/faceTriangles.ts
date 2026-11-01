// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/faceTriangles.ts
//
// Per-face tessellation of a solid: one triangle soup per B-rep face, in
// the shape's face order. The CFD runner writes each named patch (inlet,
// outlet, walls) as its own STL region from these, so the solver's patch
// names come from the model's faces rather than from a post-hoc guess.

import type { Face } from 'replicad';
import type { OcctBackend } from './occtBackend';

export interface FaceTriangles {
  /** Index into the shape's face list (the `f<i>` of a face ref). */
  index: number;
  /** Flat xyz triples, mm. */
  vertices: number[];
  /** Flat vertex-index triples into `vertices`. */
  triangles: number[];
}

/** Tessellate every face. `tolerance` is the chordal deviation in mm. */
export function triangulateFaces(shape: OcctBackend, tolerance: number, angularTolerance = 0.1): FaceTriangles[] {
  const s = shape.getReplicadShape();
  // Runs BRepMesh over the whole shape; each face then holds its triangulation.
  s.mesh({ tolerance, angularTolerance });
  const faces = (s as unknown as { faces: Face[] }).faces;
  const out: FaceTriangles[] = [];
  faces.forEach((face, index) => {
    const tri = face.triangulation(0);
    if (!tri) return;
    out.push({ index, vertices: tri.vertices, triangles: tri.trianglesIndexes });
  });
  return out;
}
