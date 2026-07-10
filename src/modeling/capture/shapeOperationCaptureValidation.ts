// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FeatureId, Param } from '../../shared/intent/types';
import type { Editable } from '../../shared/runtime/paramRef';
import {
  buildBendFeatureSpec,
  buildDraftFeatureSpec,
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

export function createDraftFeatureCaptureSpec(
  records: readonly FeatureRecord[],
  baseId: FeatureId,
  angleDeg: Editable<number>,
  opts: DraftFeatureOpts,
): ShapeOperationFeatureSpec {
  requireRecord(records, baseId, `draft: base shape '${baseId}' is not from this CaptureSession`);
  return buildDraftFeatureSpec(baseId, angleDeg, opts);
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
