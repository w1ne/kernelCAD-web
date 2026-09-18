// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as replicad from 'replicad';
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import {
  cutWithHistory,
  fuseWithHistory,
  intersectWithHistory,
  mergeBooleanHistory,
} from '../../../../kernel/backends/occt/historyAwareBooleans';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { intersectionEmptyDiagnostic } from '../additiveNoOp';
import { subtractiveNoOpDiagnostic } from '../subtractiveNoOp';
import { built, type LowerContext, type LowerOutcome } from './context';

/** `boolean` — folds every `cutter_*` input into `base` with the history-aware
 *  op, then gates the two silent-no-op cases (cut that missed, empty
 *  intersection). */
export function lowerBoolean(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  // Op expression is a quoted string in IR (e.g. "'difference'").
  const op = String(r.params.op.expression).replace(/'/g, '');
  const base = ctx.inputs.byKey['base'];
  if (!base) throw new Error(`Boolean ${r.id} missing 'base' input`);
  let acc: OcctBackend = base as OcctBackend;
  // For a difference, capture the base volume so we can flag a no-op cut
  // (cutter missed the body) below — the kernel otherwise returns the
  // unchanged solid as a success.
  const volumeBeforeCut = op === 'difference' ? acc.volume() : null;
  const cutters = Object.entries(ctx.inputs.byKey)
    .filter(([k]) => k.startsWith('cutter_'))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v as OcctBackend);
  const opFn =
    op === 'difference' ? cutWithHistory :
    op === 'union' ? fuseWithHistory :
    op === 'intersection' ? intersectWithHistory :
    null;
  if (!opFn) throw new Error(`Unknown boolean op: ${op}`);
  for (const c of cutters) {
    const result = opFn(acc, c);
    const newMap = mergeBooleanHistory(acc.historyMap, c.historyMap, result);
    // Wrap the result TopoDS_Shape back into a Replicad Shape3D using
    // replicad.cast(), which downcasts the raw shape to the correct
    // OCCT subtype (Solid or Compound) and wraps it in the matching
    // Replicad class. The cast result is AnyShape; boolean ops always
    // yield a 3D solid or compound, so the cast to Shape3D is safe.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = replicad.cast(result.shape as any) as replicad.Shape3D;
    acc = new OcctBackend(wrapped, undefined, newMap);
  }
  const shape: ShapeBackend = acc;
  if (volumeBeforeCut !== null) {
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
