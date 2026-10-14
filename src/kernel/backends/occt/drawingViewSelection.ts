// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { computeFrontSheetLayout, computeSheetLayout } from './drawingLayout';
import type { DrawingViewName, ProjectionAngle, SheetLayout, SheetSpec, ViewBox2 } from './drawingLayout';

export const DRAWING_VIEW_NAMES: readonly DrawingViewName[] = ['front', 'top', 'left', 'iso'];

interface ViewSelectionOptions {
  views?: readonly DrawingViewName[];
  annotations?: readonly { view?: DrawingViewName }[];
  balloons?: boolean;
  exploded?: unknown;
  explodedParts?: unknown;
}

export function isFrontOnlyDrawing(views?: readonly DrawingViewName[]): boolean {
  return views?.length === 1 && views[0] === 'front';
}

function validateRequestedViews(views: readonly DrawingViewName[] | undefined, frontOnly: boolean): void {
  if (views === undefined || frontOnly) return;
  const complete = views.length === 4 && new Set(views).size === 4
    && views.every(v => DRAWING_VIEW_NAMES.includes(v));
  if (!complete) throw new Error('Drawing views must be ["front"] or the complete front/top/left/iso set.');
}

function validateFrontOnlyOptions(options: ViewSelectionOptions): void {
  if (options.annotations?.some(a => a.view !== undefined && a.view !== 'front')) {
    throw new Error('Front-only drawings require annotations on the front view.');
  }
  if (options.balloons === true || options.exploded !== undefined || options.explodedParts !== undefined) {
    throw new Error('Balloons and exploded overlays require an isometric view.');
  }
}

export function validateDrawingViewSelection(options: ViewSelectionOptions): boolean {
  const frontOnly = isFrontOnlyDrawing(options.views);
  validateRequestedViews(options.views, frontOnly);
  if (frontOnly) validateFrontOnlyOptions(options);
  return frontOnly;
}

export function selectedDrawingLayout(
  frontOnly: boolean,
  boxes: Record<DrawingViewName, ViewBox2>,
  sheet: SheetSpec,
  projection: ProjectionAngle,
): SheetLayout {
  return frontOnly ? computeFrontSheetLayout(boxes.front, sheet) : computeSheetLayout(boxes, sheet, projection);
}
