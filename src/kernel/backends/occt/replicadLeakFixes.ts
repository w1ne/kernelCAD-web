// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/replicadLeakFixes.ts
//
// Deterministic frees for OCCT objects replicad constructs and never deletes,
// where waiting for a JavaScript GC is not good enough. V8 collects on JS
// heap pressure, not WASM memory, so a hot path that drops big native objects
// grows the WASM heap long before any finalizer runs. Both are patched once
// on replicad's exported classes, so every internal caller gets them.
//
// - `Transformation.transform` (behind every translate, rotate, mirror and
//   scale) keeps its `BRepBuilderAPI_Transform`, which holds the deep copy it
//   made and its modification map: ~8 MB per move of a 7k-face part. The
//   SO-100 arm's collision check grew ~200 MB per sampled pose this way until
//   OCCT aborted on pose 8 of 14.
// - `Shape._mesh` keeps its `BRepMesh_IncrementalMesh`, which holds the
//   mesher's whole working model (~45 KB for a small cylinder). It is a
//   Standard_Transient, so the GC safety net (occtFinalizers.ts) must not
//   touch it: a handle could own one.
// - `Face.triangulation` (behind every mesh read-back) hands each node's
//   `gp_Pnt`, normal and triangle copy to a GC scope, which keeps them all
//   alive until a finalizer task runs, i.e. after the whole synchronous mesh
//   loop. An M6 threaded rod-and-nut's export mesh held ~1.2 GB of JS heap
//   that way; the copies are now deleted as they are read.

import * as replicad from 'replicad';
import { getOC } from 'replicad';

const PATCHED = Symbol.for('kernelcad.replicadLeakFixes');

interface TransformationProto {
  wrapped: unknown;
  transform(shape: unknown): unknown;
}

interface TriangulatedFace {
  vertices: number[];
  trianglesIndexes: number[];
  verticesNormals: number[];
}

interface FaceProto {
  wrapped: unknown;
  orientation: 'forward' | 'backward';
  triangulation(index0?: number): TriangulatedFace | null;
}

interface ShapeProto {
  wrapped: unknown;
  _mesh(opts?: { tolerance?: number; angularTolerance?: number }): void;
  [PATCHED]?: true;
}

export function installReplicadLeakFixes(): void {
  const shape = replicad.Shape.prototype as unknown as ShapeProto;
  if (shape[PATCHED]) return;

  const transformation = replicad.Transformation.prototype as unknown as TransformationProto;
  transformation.transform = function transform(this: TransformationProto, target: unknown): unknown {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = getOC() as any;
    const transformer = new oc.BRepBuilderAPI_Transform_2(target, this.wrapped, true);
    try {
      // The result handle is an independent copy referencing the new shape.
      return transformer.ModifiedShape(target);
    } finally {
      transformer.delete();
    }
  };

  shape._mesh = function _mesh(this: ShapeProto, { tolerance = 1e-3, angularTolerance = 0.1 } = {}): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = getOC() as any;
    // Same call as replicad's; the triangulation lives on the shape's faces.
    new oc.BRepMesh_IncrementalMesh_2(this.wrapped, tolerance, false, angularTolerance, false).delete();
  };

  (replicad.Face.prototype as unknown as FaceProto).triangulation = triangulation;

  shape[PATCHED] = true;
}

/** replicad's `Face.triangulation`, same output, with every copy deleted. */
function triangulation(this: FaceProto, index0 = 0): TriangulatedFace | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const location = new oc.TopLoc_Location_1();
  const handle = oc.BRep_Tool.Triangulation(this.wrapped, location, 0);
  const transformation = location.Transformation();
  try {
    if (handle.IsNull()) return null;
    const tri = handle.get();
    const nbNodes: number = tri.NbNodes();
    const vertices = new Array<number>(nbNodes * 3);
    for (let i = 1; i <= nbNodes; i++) {
      const node = tri.Node(i);
      const p = node.Transformed(transformation);
      vertices[(i - 1) * 3] = p.X();
      vertices[(i - 1) * 3 + 1] = p.Y();
      vertices[(i - 1) * 3 + 2] = p.Z();
      p.delete();
      node.delete();
    }

    const normals = new oc.TColgp_Array1OfDir_2(1, nbNodes);
    const connect = new oc.Poly_Connect_2(handle);
    let verticesNormals: number[];
    try {
      oc.StdPrs_ToolTriangulatedShape.Normal(this.wrapped, connect, normals);
      verticesNormals = new Array<number>(normals.Length() * 3);
      for (let i = normals.Lower(); i <= normals.Upper(); i++) {
        const value = normals.Value(i);
        const d = value.Transformed(transformation);
        verticesNormals[(i - 1) * 3] = d.X();
        verticesNormals[(i - 1) * 3 + 1] = d.Y();
        verticesNormals[(i - 1) * 3 + 2] = d.Z();
        d.delete();
        value.delete();
      }
    } finally {
      connect.delete();
      normals.delete();
    }

    const backward = this.orientation === 'backward';
    const nbTriangles: number = tri.NbTriangles();
    const trianglesIndexes = new Array<number>(nbTriangles * 3);
    for (let nt = 1; nt <= nbTriangles; nt++) {
      const t = tri.Triangle(nt);
      const n1: number = t.Value(1);
      const n2: number = t.Value(2);
      const n3: number = t.Value(3);
      t.delete();
      trianglesIndexes[(nt - 1) * 3] = (backward ? n2 : n1) - 1 + index0;
      trianglesIndexes[(nt - 1) * 3 + 1] = (backward ? n1 : n2) - 1 + index0;
      trianglesIndexes[(nt - 1) * 3 + 2] = n3 - 1 + index0;
    }
    return { vertices, trianglesIndexes, verticesNormals };
  } finally {
    transformation.delete();
    handle.delete();
    location.delete();
  }
}
