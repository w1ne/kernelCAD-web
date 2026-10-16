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

import * as replicad from 'replicad';
import { getOC } from 'replicad';

const PATCHED = Symbol.for('kernelcad.replicadLeakFixes');

interface TransformationProto {
  wrapped: unknown;
  transform(shape: unknown): unknown;
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

  shape[PATCHED] = true;
}
