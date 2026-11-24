// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// splitPlane — one side of an infinite-plane split.
//
// The bundled OCCT has no splitter or half-space primitive, so each record
// intersects the body with a bounded box that covers one side of the plane.
// Both half-space faces coincide with the requested plane. History and edge
// lineage are merged the same way as the other boolean lowerers.

import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { booleanRecoveryDiagnostic } from '../../../../kernel/backends/occt/booleanRecovery';
import {
  intersectWithHistory,
  mergeBooleanHistory,
} from '../../../../kernel/backends/occt/historyAwareBooleans';
import { planeSplitCutters } from '../../../../kernel/geometry/planeSplitCutters';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { invalidArgsText } from '../../../../shared/intent/invalidArgs';
import type { Vec3Param } from '../../../../shared/intent/types';
import { emptyResultDiagnostic } from '../additiveNoOp';
import { mergeEdges, wrapBooleanResult } from './boolean';
import { built, noShape, type LowerContext, type LowerOutcome } from './context';
import { readVec3Param } from './helpers';

type SplitSide = 'positive' | 'negative';

function sideOf(record: FeatureRecord): SplitSide {
  const named = record.metadata?.splitPlaneSide;
  if (named === 'positive' || named === 'negative') return named;
  return String(record.params.side?.expression ?? '').replace(/'/g, '') === 'negative'
    ? 'negative'
    : 'positive';
}

function invalidArg(ctx: LowerContext, record: FeatureRecord, path: string, provided: string): void {
  ctx.diagnostics.push({
    target: ctx.target,
    code: 'feature.invalid-args',
    featureId: record.id,
    severity: 'error',
    ...invalidArgsText({
      api: 'shape.splitByPlane(normal, offset)',
      path,
      gotText: provided,
      requires: 'a non-zero finite normal and a finite offset',
      example: 'box(40, 30, 20).splitByPlane([0, 0, 1], 8)',
    }),
  });
}

/** `splitPlane` — return the solid on the record's side of the plane. */
export function lowerSplitPlane(ctx: LowerContext, record: FeatureRecord): LowerOutcome {
  const base = ctx.inputs.byKey.base;
  if (!(base instanceof OcctBackend)) {
    invalidArg(ctx, record, 'base', 'a missing or non-BRep input');
    return noShape();
  }

  const normalParam = record.params.normal as Vec3Param | undefined;
  if (
    normalParam === undefined
    || ![normalParam.x, normalParam.y, normalParam.z].every((p) => Number.isFinite(p?.evaluated))
  ) {
    invalidArg(ctx, record, 'normal', 'a normal with missing or non-finite components');
    return noShape();
  }
  const normal = readVec3Param(normalParam);
  const offset = record.params.offset?.evaluated;
  if (!Number.isFinite(offset)) {
    invalidArg(ctx, record, 'offset', `a non-finite value (${String(offset)})`);
    return noShape();
  }

  let cutters: ReturnType<typeof planeSplitCutters>;
  try {
    cutters = planeSplitCutters(normal, offset, base.boundingBox());
  } catch (error) {
    invalidArg(ctx, record, 'normal', error instanceof Error ? error.message : String(error));
    return noShape();
  }

  const spec = sideOf(record) === 'positive' ? cutters[0] : cutters[1];
  const cutter = OcctBackend.box(spec.size, spec.size, spec.size, true).applyTransform(spec.transform);
  const result = intersectWithHistory(base, cutter);
  const recovered = booleanRecoveryDiagnostic(record.id, `split plane ${sideOf(record)}`, result);
  if (recovered) ctx.diagnostics.push(recovered);

  const shape: ShapeBackend = wrapBooleanResult(
    result,
    mergeBooleanHistory(base.historyMap, cutter.historyMap, result),
    mergeEdges([base.edgeHistoryMap, cutter.edgeHistoryMap], result),
    record.id,
  );
  const empty = emptyResultDiagnostic({
    featureId: record.id,
    opLabel: 'splitByPlane',
    volumeAfter: (shape as OcctBackend).volume(),
    isEmpty: (shape as OcctBackend).isEmpty(),
  });
  if (empty) {
    ctx.diagnostics.push(empty);
    return noShape();
  }
  return built(shape);
}
