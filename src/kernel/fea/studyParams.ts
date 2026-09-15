// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/studyParams.ts
//
// Resolves `param()` references inside a study declaration against the
// model's param table, immediately before the study runs.
//
// Why here and not at capture: a study written as
// `fixed: { atX: 0 }, loads: [{ faces: { atZ: wall }, ... }]` must keep
// tracking `wall` when the param changes — that is the whole point of a
// parametric model, and freezing the number at capture would quietly analyse
// the wrong face after the next `set_param`. Resolving at run time keeps the
// declaration symbolic and the solve concrete.

import { isParamRef } from '../../shared/runtime/paramRef';
import { currentValue } from '../../shared/runtime/editableHelpers';
import type { ParamTable } from '../../shared/runtime/paramTable';
import type { FeaStudyMetadata } from '../../shared/intent/feaStudyRecord';

/** Deep-resolve every ParamRef leaf in a plain data value. Arrays and plain
 *  objects are rebuilt; every other value passes through untouched. */
function resolveDeep(value: unknown, table: ParamTable): unknown {
  if (isParamRef(value)) return currentValue(value as never, table);
  if (Array.isArray(value)) return value.map(v => resolveDeep(v, table));
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveDeep(v, table);
    }
    return out;
  }
  return value;
}

/** Concrete copy of a study declaration: same shape, every ParamRef replaced
 *  by its current numeric value. */
export function resolveStudyParams(study: FeaStudyMetadata, table: ParamTable): FeaStudyMetadata {
  return resolveDeep(study, table) as FeaStudyMetadata;
}
