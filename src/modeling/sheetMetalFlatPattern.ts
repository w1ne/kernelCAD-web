// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/sheetMetalFlatPattern.ts
//
// Flat pattern WITH inner loops. `flattenPattern(records)` recovers the outer
// outline and bend lines from the records alone; holes and cutouts made on
// the blank before bending exist only in the lowered solid, so this lowers
// (or reuses) the blank and reads its top-face inner wires back.

import type { FeatureRecord } from '../shared/intent/featureRecord';
import type { FeatureId } from '../shared/intent/types';
import type { Region } from '../shared/intent/region';
import type { ShapeBackend } from '../kernel/backends/backend';
import type { ParamTable } from '../shared/runtime/paramTable';
import { initOcct, OcctBackend } from '../kernel/backends/occt/occtBackend';
import { flatBlankRecordId, flattenPattern } from '../kernel/backends/occt/flattenPattern';
import { flatBlankInnerLoops } from '../kernel/backends/occt/flatBlankLoops';
import { RecomputeEngine } from './compute/recomputeEngine';
import { OcctLowerer } from './backends/occt/occtLowerer';

/**
 * The flat pattern of the sheet-metal Shape `terminalId` (default: the last
 * record), including the holes / cutouts on the blank. `lowered` reuses an
 * existing recompute's shapes; otherwise the records up to the blank are
 * lowered here. Throws the same KernelErrors as `flattenPattern`.
 */
export async function flattenPatternWithHoles(
  records: readonly FeatureRecord[],
  terminalId?: string,
  lowered?: ReadonlyMap<FeatureId, ShapeBackend>,
  paramTable?: ParamTable,
): Promise<Region> {
  const blankId = flatBlankRecordId(records, terminalId);
  let blank = lowered?.get(blankId);
  if (!blank) {
    await initOcct();
    const upTo = records.findIndex((r) => r.id === blankId);
    const run = await new RecomputeEngine(new OcctLowerer())
      .run(records.slice(0, upTo + 1), paramTable ? { paramTable } : undefined);
    blank = run.shapes.get(blankId);
  }
  const holes = blank instanceof OcctBackend ? flatBlankInnerLoops(blank) : [];
  return flattenPattern(records, terminalId, { holes });
}
