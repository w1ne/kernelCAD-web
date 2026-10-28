// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Approximate native cost of a shape, for cache budgets. The wasm heap never
// shrinks, so a cache that only counts entries can still pin more RSS than
// the evaluator's memory cap. Counting sub-shapes with a deleted explorer
// avoids replicad's `.faces` getter, which allocates a Face wrapper per face
// and leaves those handles for the GC.

import { getOC } from 'replicad';
import { isSceneBackend } from '../sceneBackend';

const FACE_BYTES = 16_384;
const EDGE_BYTES = 1_024;
const UNKNOWN_BYTES = 256 * 1024;

function countSubshapes(wrapped: object, kind: 'TopAbs_FACE' | 'TopAbs_EDGE'): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const explorer = new oc.TopExp_Explorer_2(
    wrapped,
    oc.TopAbs_ShapeEnum[kind],
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  let count = 0;
  try {
    while (explorer.More()) {
      count += 1;
      explorer.Next();
    }
  } finally {
    explorer.delete();
  }
  return count;
}

function approxOne(shape: object): number {
  const wrapped = (shape as { getReplicadShape?: () => { wrapped?: object } }).getReplicadShape?.()?.wrapped;
  if (!wrapped) return UNKNOWN_BYTES;
  try {
    const faces = countSubshapes(wrapped, 'TopAbs_FACE');
    const edges = countSubshapes(wrapped, 'TopAbs_EDGE');
    return 4096 + faces * FACE_BYTES + edges * EDGE_BYTES;
  } catch {
    return UNKNOWN_BYTES;
  }
}

/** Bytes to charge a cache for `shape`. Scenes sum their part solids once. */
export function approxOcctBytes(shape: object): number {
  if (!isSceneBackend(shape)) return approxOne(shape);
  const seen = new Set<object>();
  let total = 0;
  for (const part of shape.parts) {
    if (seen.has(part.shape)) continue;
    seen.add(part.shape);
    total += approxOne(part.shape);
  }
  return total;
}
