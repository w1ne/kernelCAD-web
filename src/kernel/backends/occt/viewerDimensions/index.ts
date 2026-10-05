// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/viewerDimensions/index.ts
//
// Entry point for 3D viewer dimensions: declared first, then automatic, all
// under one time budget. Never throws and never fails the build — on
// overrun or any error the viewer gets no dimensions and one warning.

import type { WorldFramePart } from '../sceneToWorldFrame';
import type { DrawingDimensionSpec } from '../../../../shared/intent/drawingGdtRecord';
import type { CompilerDiagnostic } from '../../../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES, NEXT_ACTIONS } from '../../../../shared/diagnostics/registry';
import { autoDimensions } from './auto';
import { declaredDimensions } from './declared';
import type { ViewerDimension } from './types';

export type { V3, ViewerDimension } from './types';
export { formatMm, groupLabel } from './format';

export const DEFAULT_BUDGET_MS = 3000;

export interface ViewerDimensionsInput {
  parts: readonly WorldFramePart[];
  declared: readonly DrawingDimensionSpec[];
  auto: boolean;
  /** Wall-clock budget in milliseconds; default 3000. */
  budgetMs?: number;
}

export interface ViewerDimensionsResult {
  dimensions: ViewerDimension[];
  diagnostics: CompilerDiagnostic[];
}

class BudgetExceeded extends Error {}

function budgetWarning(err: unknown): CompilerDiagnostic {
  const why = err instanceof Error ? err.message : String(err);
  return {
    target: 'export-occt',
    code: 'viewer.dimensions.budget-exceeded',
    severity: 'warn',
    message: `Viewer dimensions skipped: ${why}`,
    hint: HINT_TEMPLATES['viewer.dimensions.budget-exceeded'].template,
    nextAction: NEXT_ACTIONS['viewer.dimensions.budget-exceeded'],
  };
}

export function computeViewerDimensions(input: ViewerDimensionsInput): ViewerDimensionsResult {
  const budgetMs = input.budgetMs ?? DEFAULT_BUDGET_MS;
  const start = performance.now();
  const checkpoint = (): void => {
    const elapsed = performance.now() - start;
    if (elapsed > budgetMs) {
      throw new BudgetExceeded(`computation passed its ${budgetMs} ms budget (${Math.round(elapsed)} ms)`);
    }
  };
  try {
    checkpoint();
    const declared = declaredDimensions(input.parts, input.declared, checkpoint);
    const auto = input.auto ? autoDimensions(input.parts, checkpoint) : [];
    return { dimensions: [...declared.dimensions, ...auto], diagnostics: declared.diagnostics };
  } catch (err) {
    return { dimensions: [], diagnostics: [budgetWarning(err)] };
  }
}
