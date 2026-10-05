// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/composition/viewerDimensionsForModel.ts
//
// Viewer dimensions for a built model: declared `shape.dimension()` records
// plus automatic ones, for the mesh bridge payload.
import type { BuiltModel } from '../modeling/buildModel';
import { collectDrawingDeclarations } from '../modeling/runtime/drawingDeclarations';
import { drawingPartsForBackend } from '../kernel/backends/occt/sceneToWorldFrame';
import { computeViewerDimensions } from '../kernel/backends/occt/viewerDimensions';
import type { ViewerDimension } from '../shared/intent/viewerDimension';
import type { CompilerDiagnostic } from '../shared/diagnostics/diagnostic';

export function viewerDimensionsForModel(
  model: BuiltModel,
  opts: { auto?: boolean; budgetMs?: number } = {},
): { dimensions: ViewerDimension[]; diagnostics: CompilerDiagnostic[] } {
  if (model.rootShape === undefined) return { dimensions: [], diagnostics: [] };
  const declared = model.rootId === undefined
    ? []
    : collectDrawingDeclarations(model.records, model.rootId).dimensions;
  return computeViewerDimensions({
    parts: drawingPartsForBackend(model.rootShape),
    declared,
    auto: opts.auto ?? true,
    ...(opts.budgetMs !== undefined ? { budgetMs: opts.budgetMs } : {}),
  });
}
