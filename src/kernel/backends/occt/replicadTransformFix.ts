// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/replicadTransformFix.ts
//
// replicad's `Transformation.transform` (behind every translate, rotate,
// mirror and scale) builds a `BRepBuilderAPI_Transform` with copy=true and
// never deletes it. The transformer holds the deep copy it made and its
// modification map, so each move of a 7k-face part kept ~8 MB alive until a
// JavaScript GC, and V8 collects on JS heap pressure, not WASM memory. The
// SO-100 arm's collision check poses 13 parts per sampled time and grew the
// WASM heap ~200 MB per pose until OCCT aborted on pose 8 of 14.
//
// The replacement is the same call with the transformer freed as soon as the
// result handle is taken (the handle is an independent copy that references
// the result shape). Patched once on the exported class, so every replicad
// internal caller gets it.

import * as replicad from 'replicad';
import { getOC } from 'replicad';

const PATCHED = Symbol.for('kernelcad.replicadTransformFix');

interface TransformationProto {
  wrapped: unknown;
  transform(shape: unknown): unknown;
  [PATCHED]?: true;
}

export function installReplicadTransformFix(): void {
  const proto = replicad.Transformation.prototype as unknown as TransformationProto;
  if (proto[PATCHED]) return;
  proto.transform = function transform(this: TransformationProto, shape: unknown): unknown {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = getOC() as any;
    const transformer = new oc.BRepBuilderAPI_Transform_2(shape, this.wrapped, true);
    try {
      return transformer.ModifiedShape(shape);
    } finally {
      transformer.delete();
    }
  };
  proto[PATCHED] = true;
}
