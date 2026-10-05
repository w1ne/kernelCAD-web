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
import { featureDimensions, overallDimensions } from './auto';
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

function budgetWarning(message: string): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'viewer.dimensions.budget-exceeded',
    severity: 'warn',
    message,
    hint: HINT_TEMPLATES['viewer.dimensions.budget-exceeded'].template,
    nextAction: NEXT_ACTIONS['viewer.dimensions.budget-exceeded'],
  };
}

/**
 * Declared dimensions first, then automatic ones, under one wall-clock
 * budget checked between rules (and between bore probes). On overrun the
 * dimensions already computed are kept, overall extents always included,
 * plus a budget warning. Any other error returns no dimensions and a
 * warning carrying the reason.
 */
export function computeViewerDimensions(input: ViewerDimensionsInput): ViewerDimensionsResult {
  const budgetMs = input.budgetMs ?? DEFAULT_BUDGET_MS;
  const start = performance.now();
  const checkpoint = (): void => {
    const elapsed = performance.now() - start;
    if (elapsed > budgetMs) {
      throw new BudgetExceeded(`computation passed its ${budgetMs} ms budget (${Math.round(elapsed)} ms)`);
    }
  };
  const declared: ViewerDimensionsResult = { dimensions: [], diagnostics: [] };
  let overall: ViewerDimension[] = [];
  const features: ViewerDimension[] = [];
  const all = (): ViewerDimension[] => [...declared.dimensions, ...overall, ...features];
  try {
    // Bounding boxes only: cheap, so they run before any checkpoint and
    // every result (overrun included) carries them.
    overall = input.auto ? overallDimensions(input.parts) : [];
    declaredDimensions(input.parts, input.declared, checkpoint, declared);
    if (input.auto) featureDimensions(input.parts, overall.length, checkpoint, features);
    return { dimensions: all(), diagnostics: declared.diagnostics };
  } catch (err) {
    if (err instanceof BudgetExceeded) {
      return {
        dimensions: all(),
        diagnostics: [...declared.diagnostics, budgetWarning(`Viewer dimensions incomplete: ${err.message}; showing the dimensions computed before the cut-off.`)],
      };
    }
    const why = err instanceof Error ? err.message : String(err);
    return { dimensions: [], diagnostics: [budgetWarning(`Viewer dimensions failed: ${why}`)] };
  }
}
