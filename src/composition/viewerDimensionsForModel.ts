// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/composition/viewerDimensionsForModel.ts
//
// Viewer dimensions for a built model: declared `shape.dimension()` records
// plus automatic ones, for the mesh bridge payload.
import type { FeatureRecord } from '../shared/intent/featureRecord';
import type { ShapeBackend } from '../kernel/backends/backend';
import type { BuiltModel } from '../modeling/buildModel';
import { collectDrawingDeclarations } from '../modeling/runtime/drawingDeclarations';
import { drawingPartsForBackend } from '../kernel/backends/occt/sceneToWorldFrame';
import { computeViewerDimensions } from '../kernel/backends/occt/viewerDimensions';
import type { ViewerDimension } from '../shared/intent/viewerDimension';
import type { CompilerDiagnostic } from '../shared/diagnostics/diagnostic';

export interface ViewerDimensionsRoot {
  records: readonly FeatureRecord[];
  rootId?: string;
  rootShape?: ShapeBackend;
}

type Opts = { auto?: boolean; budgetMs?: number };
type Result = { dimensions: ViewerDimension[]; diagnostics: CompilerDiagnostic[] };

/** Dimensions from records + the lowered root shape, for callers that have no `BuiltModel`. */
export function viewerDimensionsForRoot(root: ViewerDimensionsRoot, opts: Opts = {}): Result {
  if (root.rootShape === undefined) return { dimensions: [], diagnostics: [] };
  const declared = root.rootId === undefined
    ? []
    : collectDrawingDeclarations(root.records, root.rootId).dimensions;
  const auto = opts.auto ?? true;
  if (!auto && declared.length === 0) return { dimensions: [], diagnostics: [] };
  const rootShape = root.rootShape;
  return computeViewerDimensions({
    parts: () => drawingPartsForBackend(rootShape),
    declared,
    auto,
    ...(opts.budgetMs !== undefined ? { budgetMs: opts.budgetMs } : {}),
  });
}

export function viewerDimensionsForModel(model: BuiltModel, opts: Opts = {}): Result {
  return viewerDimensionsForRoot(model, opts);
}
