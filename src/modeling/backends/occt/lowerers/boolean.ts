// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as replicad from 'replicad';
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import {
  cutManyWithHistory,
  fuseManyWithHistory,
  intersectWithHistory,
  mergeBooleanHistory,
  mergeBooleanHistoryMany,
  type BooleanHistoryResult,
} from '../../../../kernel/backends/occt/historyAwareBooleans';
import { booleanRecoveryDiagnostic } from '../../../../kernel/backends/occt/booleanRecovery';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { intersectionEmptyDiagnostic } from '../additiveNoOp';
import { subtractiveNoOpDiagnostic } from '../subtractiveNoOp';
import { built, type LowerContext, type LowerOutcome } from './context';
import { stampSolid } from '../../../../kernel/naming/operationLineage';
import type { EdgeHistoryMap, HistoryMap } from '../../../../kernel/naming/evolutionRecord';

/** Wrap a history-aware boolean result back into an `OcctBackend` with the
 *  merged face/edge lineage. `replicad.cast` downcasts the raw TopoDS_Shape to
 *  the correct OCCT subtype (Solid or Compound) and wraps it in the matching
 *  Replicad class; boolean ops always yield a 3D solid or compound. */
function mergeEdges(
  inputMaps: readonly (EdgeHistoryMap | undefined)[],
  result: BooleanHistoryResult,
): EdgeHistoryMap {
  const out: EdgeHistoryMap = new Map();
  for (const inputMap of inputMaps) {
    if (!inputMap) continue;
    for (const [hash, lineage] of inputMap) {
      if (result.deletedEdges.has(hash)) continue;
      const children = result.edgeHistory.get(hash);
      if (children && children.length > 0) {
        for (const child of children) if (!out.has(child)) out.set(child, lineage);
      } else if (!out.has(hash)) out.set(hash, lineage);
    }
  }
  return out;
}

function wrapBooleanResult(
  result: BooleanHistoryResult,
  faceMap: HistoryMap,
  edgeMap: EdgeHistoryMap,
  featureId: string,
): OcctBackend {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = replicad.cast(result.shape as any) as replicad.Shape3D;
  const probe = new OcctBackend(wrapped);
  const stamped = stampSolid(faceMap, probe.faceHashes(), edgeMap, probe.edgeHashes(), featureId);
  const out = new OcctBackend(wrapped, undefined, stamped.historyMap);
  out.edgeHistoryMap = stamped.edgeHistoryMap;
  return out;
}

/** Fold the tools one at a time, merging lineage pair by pair (intersection). */
function foldPairwise(
  acc: OcctBackend,
  cutters: readonly OcctBackend[],
  op: string,
  r: FeatureRecord,
  ctx: LowerContext,
): OcctBackend {
  for (const c of cutters) {
    const result = intersectWithHistory(acc, c);
    const recovered = booleanRecoveryDiagnostic(r.id, `boolean ${op}`, result);
    if (recovered) ctx.diagnostics.push(recovered);
    acc = wrapBooleanResult(
      result,
      mergeBooleanHistory(acc.historyMap, c.historyMap, result),
      mergeEdges([acc.edgeHistoryMap, c.edgeHistoryMap], result),
      r.id,
    );
  }
  return acc;
}

/** ONE boolean build with every tool of the record. Folding N cutters pairwise
 *  re-intersected the growing accumulator on every step (an 8-hole plate paid
 *  8 cuts of progressively larger solids) for what is one general boolean.
 *  History merges inputs in record order — the same earliest-input-wins fold
 *  the pairwise path produced. */
function runManyToolBoolean(
  acc: OcctBackend,
  cutters: readonly OcctBackend[],
  opKind: 'cut' | 'fuse',
  op: string,
  r: FeatureRecord,
  ctx: LowerContext,
): OcctBackend {
  const result = opKind === 'cut' ? cutManyWithHistory(acc, cutters) : fuseManyWithHistory(acc, cutters);
  const recovered = booleanRecoveryDiagnostic(r.id, `boolean ${op}`, result);
  if (recovered) ctx.diagnostics.push(recovered);
  const newMap = mergeBooleanHistoryMany(
    [acc.historyMap, ...cutters.map((c) => c.historyMap)],
    result,
  );
  return wrapBooleanResult(result, newMap, mergeEdges([acc.edgeHistoryMap, ...cutters.map((c) => c.edgeHistoryMap)], result), r.id);
}

/** `boolean` — folds every `cutter_*` input into `base` with the history-aware
 *  op, then gates the two silent-no-op cases (cut that missed, empty
 *  intersection). */
export function lowerBoolean(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  // Op expression is a quoted string in IR (e.g. "'difference'").
  const op = String(r.params.op.expression).replace(/'/g, '');
  const base = ctx.inputs.byKey['base'];
  if (!base) throw new Error(`Boolean ${r.id} missing 'base' input`);
  let acc: OcctBackend = base as OcctBackend;
  const cutters = Object.entries(ctx.inputs.byKey)
    .filter(([k]) => k.startsWith('cutter_'))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v as OcctBackend);
  // For a difference, capture the base volume so we can flag a no-op cut
  // (cutter missed the body) below — the kernel otherwise returns the
  // unchanged solid as a success. With no cutters nothing could have missed.
  const volumeBeforeCut = op === 'difference' && cutters.length > 0 ? acc.volume() : null;
  // A zero-cutter boolean must not hand out its cached input: a later
  // transform consumes the OCCT handle and breaks the source on reuse.
  if (cutters.length === 0) {
    acc = acc.clone();
  } else if (op === 'intersection') {
    // OCCT's multi-tool Common computes `a ∩ (b ∪ c)`; the historical record
    // semantics are a sequential fold `a ∩ b ∩ c`. Keep the pairwise fold so
    // this op's result is unchanged (cuts and unions are equivalent either way).
    acc = foldPairwise(acc, cutters, op, r, ctx);
  } else if (op === 'difference') {
    acc = runManyToolBoolean(acc, cutters, 'cut', op, r, ctx);
  } else if (op === 'union') {
    acc = runManyToolBoolean(acc, cutters, 'fuse', op, r, ctx);
  } else {
    throw new Error(`Unknown boolean op: ${op}`);
  }
  const shape: ShapeBackend = acc;
  // A clearance cut (joint.clevis tongue pocket) may legitimately find no
  // material to remove; it is declared so at capture time.
  if (volumeBeforeCut !== null && r.metadata?.clearanceCut !== true) {
    const noop = subtractiveNoOpDiagnostic({
      featureId: r.id,
      opLabel: 'boolean difference',
      volumeBefore: volumeBeforeCut,
      volumeAfter: acc.volume(),
    });
    if (noop) ctx.diagnostics.push(noop);
  }
  // Additive analog of the cutter-miss: an intersection of disjoint
  // bodies yields no common solid. Empty/zero-volume here is unambiguous
  // (the operands don't overlap). Union is NOT gated — containment of one
  // operand in another is a legitimate no-volume-change result.
  if (op === 'intersection') {
    const empty = intersectionEmptyDiagnostic({
      featureId: r.id,
      volumeAfter: acc.volume(),
      isEmpty: acc.isEmpty(),
    });
    if (empty) ctx.diagnostics.push(empty);
  }
  return built(shape);
}
