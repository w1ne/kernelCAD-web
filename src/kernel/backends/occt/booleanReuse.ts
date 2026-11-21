// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Replay a finished boolean onto operands that are copies of the ones it was
// built from. A helper function called twice (two identical pylons, two
// battery containers) captures two record chains that differ only in ids; the
// second chain's booleans are the first chain's booleans again, and an exact
// general fuse of thin crossing cylinders costs a second or more each.
//
// The replay shares the first result's TShape (as `OcctBackend.clone` does)
// and rewrites its history onto the new operands: operand sub-shapes are
// matched by explorer order, which is identical for identically built
// operands. A count mismatch means the operands are not copies, and the
// caller builds the boolean normally.

import { getOC } from 'replicad';
import { collectSubshapeHashes, type BooleanHistoryResult } from './historyAwareBooleans';

export interface BooleanReplay {
  /** The finished result; `shape` is a handle this replay owns. */
  readonly result: BooleanHistoryResult;
  /** Face / edge hashes of each operand, in explorer order. */
  readonly operandFaces: readonly (readonly string[])[];
  readonly operandEdges: readonly (readonly string[])[];
}

function ownHandle(shape: unknown): unknown {
  // A by-value copy of the handle (same TShape, location and orientation),
  // freed independently of the one it was copied from.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = shape as any;
  return s.Oriented(s.Orientation_1());
}

/** Remember `result`, built from `operands` (raw TopoDS_Shape handles). */
export function captureBooleanReplay(result: BooleanHistoryResult, operands: readonly unknown[]): BooleanReplay {
  const oc = getOC();
  return {
    result: { ...result, shape: ownHandle(result.shape) },
    operandFaces: operands.map((s) => collectSubshapeHashes(oc, s, 'face').hashes),
    operandEdges: operands.map((s) => collectSubshapeHashes(oc, s, 'edge').hashes),
  };
}

/** Free the handle a replay owns. */
export function releaseBooleanReplay(replay: BooleanReplay): void {
  (replay.result.shape as { delete?: () => void }).delete?.();
}

/** Map each recorded operand hash to the new operand's hash at the same position. */
function hashMap(
  recorded: readonly (readonly string[])[],
  current: readonly (readonly string[])[],
): Map<string, string> | undefined {
  if (recorded.length !== current.length) return undefined;
  const map = new Map<string, string>();
  for (let i = 0; i < recorded.length; i++) {
    if (recorded[i].length !== current[i].length) return undefined;
    for (let k = 0; k < recorded[i].length; k++) {
      const known = map.get(current[i][k]);
      // The same new sub-shape at two positions must stand for one recorded one.
      if (known !== undefined && known !== recorded[i][k]) return undefined;
      map.set(current[i][k], recorded[i][k]);
    }
  }
  return map;
}

/**
 * History of the recorded result relative to the new operands. A recorded
 * operand sub-shape absent from the history kept its hash in the result; the
 * matching new sub-shape has a different hash, so it gets an explicit entry
 * pointing at the result sub-shape.
 */
function rebase(
  history: ReadonlyMap<string, string[]>,
  deleted: ReadonlySet<string>,
  newToRecorded: ReadonlyMap<string, string>,
): { history: Map<string, string[]>; deleted: Set<string> } {
  const out = new Map<string, string[]>();
  const gone = new Set<string>();
  for (const [current, recorded] of newToRecorded) {
    if (deleted.has(recorded)) gone.add(current);
    else {
      const kids = history.get(recorded);
      if (kids !== undefined) out.set(current, kids);
      else if (current !== recorded) out.set(current, [recorded]);
    }
  }
  return { history: out, deleted: gone };
}

/**
 * The recorded boolean as a result of `operands`, or undefined when the
 * operands are not built like the recorded ones. The returned `shape` is a
 * fresh handle owned by the caller.
 */
export function replayBoolean(replay: BooleanReplay, operands: readonly unknown[]): BooleanHistoryResult | undefined {
  const oc = getOC();
  const faces = hashMap(replay.operandFaces, operands.map((s) => collectSubshapeHashes(oc, s, 'face').hashes));
  if (!faces) return undefined;
  const edges = hashMap(replay.operandEdges, operands.map((s) => collectSubshapeHashes(oc, s, 'edge').hashes));
  if (!edges) return undefined;
  const f = rebase(replay.result.faceHistory, replay.result.deletedFaces, faces);
  const e = rebase(replay.result.edgeHistory, replay.result.deletedEdges, edges);
  return {
    ...replay.result,
    shape: ownHandle(replay.result.shape),
    faceHistory: f.history,
    deletedFaces: f.deleted,
    edgeHistory: e.history,
    deletedEdges: e.deleted,
  };
}
