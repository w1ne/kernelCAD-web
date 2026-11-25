// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FeatureId, Param } from '../../shared/intent/types';
import type { Editable } from '../../shared/runtime/paramRef';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import {
  buildBeadFeatureSpec,
  buildBendFeatureSpec,
  buildDraftFeatureSpec,
  buildFaceEditFeatureSpec,
  buildScalarEdgeFeatureSpec,
  buildVariableEdgeFeatureSpec,
  type DraftFeatureOpts,
  type ScalarEdgeFeatureKind,
  type ScalarEdgeFeatureOpts,
  type ScalarEdgeValueKey,
  type ShapeOperationEdgeSelector,
  type ShapeOperationFeatureSpec,
  type VariableEdgeFeatureKind,
  type VariableEdgeGroup,
  type VariableEdgeValueKey,
} from './shapeOperationFeatureRecords';
import { validateBeadOptions, type SheetMetalBeadOpts } from '../sheetMetalBead';

export function createScalarEdgeFeatureCaptureSpec(
  records: readonly FeatureRecord[],
  kind: ScalarEdgeFeatureKind,
  baseId: FeatureId,
  valueParamName: ScalarEdgeValueKey,
  value: Editable<number>,
  selector?: ShapeOperationEdgeSelector,
  opts?: ScalarEdgeFeatureOpts,
): ShapeOperationFeatureSpec {
  requireRecord(records, baseId, `${kind}: base shape '${baseId}' is not from this CaptureSession`);
  return buildScalarEdgeFeatureSpec(kind, baseId, valueParamName, value, selector, opts);
}

export function createBendFeatureCaptureSpec(
  records: readonly FeatureRecord[],
  baseId: FeatureId,
  angleParam: Param,
  radiusParam: Param,
  selector: ShapeOperationEdgeSelector,
): ShapeOperationFeatureSpec {
  requireRecord(records, baseId, `bend: base shape '${baseId}' is not from this CaptureSession`);
  return buildBendFeatureSpec(baseId, angleParam, radiusParam, selector);
}

export function createBeadFeatureCaptureSpec(
  records: readonly FeatureRecord[],
  baseId: FeatureId,
  opts: SheetMetalBeadOpts,
  paramTable?: ParamTable,
): ShapeOperationFeatureSpec {
  requireRecord(records, baseId, `bead: base shape '${baseId}' is not from this CaptureSession`);
  const validated = validateBeadOptions(opts, baseId, paramTable);
  return buildBeadFeatureSpec(baseId, validated.params, validated.profile, validated.side);
}

export function createFaceEditCaptureSpec(
  records: readonly FeatureRecord[],
  kind: 'moveFaces' | 'offsetFaces',
  baseId: FeatureId,
  faces: readonly (import('./shapeOperationFeatureRecords').ShapeOperationFaceSelector | string)[],
  params: Record<string, import('../../shared/intent/types').Param>,
): ShapeOperationFeatureSpec {
  requireRecord(records, baseId, `${kind}: base shape '${baseId}' is not from this CaptureSession`);
  return buildFaceEditFeatureSpec(kind, baseId, faces, params);
}

export function createDraftFeatureCaptureSpec(
  records: readonly FeatureRecord[],
  baseId: FeatureId,
  angleDeg: Editable<number>,
  opts: DraftFeatureOpts,
): ShapeOperationFeatureSpec {
  requireRecord(records, baseId, `draft: base shape '${baseId}' is not from this CaptureSession`);
  assertDraftOptions(opts, baseId);
  return buildDraftFeatureSpec(baseId, angleDeg, opts);
}

/** Option keys `Shape.draft` accepts. `{ face, pullDirection }` used to drop
 *  the misspelt key and draft along the default pull with no diagnostic. */
const DRAFT_OPTION_KEYS: ReadonlySet<string> = new Set(['face', 'neutralPlane', 'pullDir']);

const DRAFT_EXAMPLE = "box(40, 30, 10).draft(3, { face: 'front', pullDir: [0, 0, 1] })";

function assertDraftOptions(opts: unknown, featureId: FeatureId): void {
  if (opts === null || typeof opts !== 'object' || Array.isArray(opts)) {
    invalidArgs({
      api: 'draft(angleDeg, opts)',
      path: 'opts',
      got: opts,
      showType: true,
      requires: 'an options object { face, neutralPlane?, pullDir? }',
      example: DRAFT_EXAMPLE,
      featureId,
    });
  }
  const unknown = Object.keys(opts).find((key) => !DRAFT_OPTION_KEYS.has(key));
  if (unknown !== undefined) {
    invalidArgs({
      api: 'draft(angleDeg, opts)',
      path: `opts.${unknown}`,
      got: (opts as Record<string, unknown>)[unknown],
      requires: `a known option key; draft accepts ${[...DRAFT_OPTION_KEYS].join(', ')}`,
      example: DRAFT_EXAMPLE,
      featureId,
    });
  }
}

export function createVariableEdgeFeatureCaptureSpec(
  records: readonly FeatureRecord[],
  kind: VariableEdgeFeatureKind,
  baseId: FeatureId,
  valueKey: VariableEdgeValueKey,
  groups: readonly VariableEdgeGroup[],
): ShapeOperationFeatureSpec {
  requireRecord(records, baseId, `${kind}: base shape '${baseId}' is not from this CaptureSession`);
  return buildVariableEdgeFeatureSpec(kind, baseId, valueKey, groups);
}

function requireRecord(
  records: readonly FeatureRecord[],
  id: FeatureId,
  message: string,
): FeatureRecord {
  const record = records.find(r => r.id === id);
  if (!record) {
    throw new Error(message);
  }
  return record;
}
