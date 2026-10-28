// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Approximate native cost of a shape, for cache budgets. The wasm heap never
// shrinks, so a cache that only counts entries can still pin more RSS than
// the evaluator's memory cap. Counting sub-shapes with a deleted explorer
// avoids replicad's `.faces` getter, which allocates a Face wrapper per face
// and leaves those handles for the GC.
//
// The charge is a face and edge count, not the wasm allocation. A solid with
// few faces can still hold a large B-spline or tessellation payload and stay
// under a byte cap until a count cap evicts it. `analysisBody` (the fastener
// envelope) is a second solid and is charged on its own. A warm store keeps
// its only document even when that document alone is over the byte budget.

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

function approxWrapped(shape: object): number {
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

function approxOne(shape: object, seen: Set<object>): number {
  if (seen.has(shape)) return 0;
  seen.add(shape);
  let total = approxWrapped(shape);
  const envelope = (shape as { analysisBody?: object }).analysisBody;
  if (envelope && envelope !== shape) total += approxOne(envelope, seen);
  return total;
}

/** Bytes to charge a cache for `shape`. Scenes sum their part solids once. */
export function approxOcctBytes(shape: object): number {
  const seen = new Set<object>();
  if (!isSceneBackend(shape)) return approxOne(shape, seen);
  let total = 0;
  for (const part of shape.parts) total += approxOne(part.shape, seen);
  return total;
}
