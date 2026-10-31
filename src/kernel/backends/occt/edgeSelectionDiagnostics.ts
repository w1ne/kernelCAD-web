// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { invalidArgsText } from '../../../shared/intent/invalidArgs';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';

export function stableEdgeIdResolutionError(
  record: FeatureRecord,
  stableId: string,
  reason: string,
): CompilerDiagnostic {
  const text = invalidArgsText({
    api: `${record.kind}(radius, edges)`,
    path: 'edges',
    got: stableId,
    requires: `a stable edge ID that uniquely matches one edge on the current shape (${reason})`,
    example: `body.${record.kind}(1, '@kc[box_1/edge/s0123456789abcdef]')`,
  });
  return {
    target: 'export-occt',
    code: 'feature.invalid-args',
    featureId: record.id,
    severity: 'error',
    message: text.message,
    hint: text.hint,
  };
}
